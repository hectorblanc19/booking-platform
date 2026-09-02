import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COMEBACK_DAYS = 21;

const SERVICE_TRANSLATIONS = {
  Haircut: {
    en: "Haircut",
    es: "Corte",
  },
  Beard: {
    en: "Beard",
    es: "Barba",
  },
  "Haircut + Beard": {
    en: "Haircut + Beard",
    es: "Corte + Barba",
  },
  Fade: {
    en: "Fade",
    es: "Degradado",
  },
  Other: {
    en: "Other",
    es: "Otro",
  },
};

function isAuthorizedCron(req) {
  const authHeader = req.headers.get("authorization");

  return (
    authHeader ===
    `Bearer ${process.env.CRON_SECRET}`
  );
}

function isValidEmail(email) {
  if (!email) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email).trim()
  );
}

function normalizePhone(phone) {
  if (!phone) return "";

  const digits = String(phone).replace(/\D/g, "");

  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return digits.slice(1);
  }

  return digits;
}

function normalizeEmail(email) {
  if (!isValidEmail(email)) return "";

  return String(email)
    .trim()
    .toLowerCase();
}

function getCustomerKey(appointment) {
  const phone = normalizePhone(
    appointment.customer_phone
  );

  const email = normalizeEmail(
    appointment.customer_email
  );

  const name = String(
    appointment.customer_name || ""
  )
    .trim()
    .toLowerCase();

  /*
   * Same matching strategy used by Customer History:
   * phone first, valid email second, name last.
   */
  if (phone) {
    return `phone:${phone}`;
  }

  if (email) {
    return `email:${email}`;
  }

  return `name:${name}`;
}

function getLanguage(lang) {
  return lang === "es" ? "es" : "en";
}

function getAppointmentDateTime(appointment) {
  return new Date(
    `${appointment.date}T${
      appointment.time || "00:00:00"
    }`
  ).getTime();
}

export async function GET(req) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    /*
     * Calculate the date that is exactly 21 days ago.
     */
    const targetDate = new Date();

    targetDate.setDate(
      targetDate.getDate() - COMEBACK_DAYS
    );

    const targetDateString =
      targetDate.toISOString().split("T")[0];

    console.log(
      "🔎 Comeback reminder date:",
      targetDateString
    );
    /*
     * Get completed appointments from the target date.
     */
    const { data: targetAppointments, error } =
      await supabase
        .from("appointments")
        .select(`
          id,
          barber_id,
          customer_name,
          customer_email,
          customer_phone,
          service,
          date,
          time,
          status,
          secret_link,
          lang
        `)
        .eq("status", "completed")
        .eq("date", targetDateString);

    if (error) {
      console.error(
        "❌ Comeback reminder query error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    if (
      !targetAppointments ||
      targetAppointments.length === 0
    ) {
      return NextResponse.json({
        success: true,
        comebackDays: COMEBACK_DAYS,
        targetDate: targetDateString,
        completedAppointmentsFound: 0,
        eligibleForEmail: 0,
        sent: 0,
        skippedAlreadySent: 0,
        skippedNoValidEmail: 0,
        skippedReturnedSince: 0,
        failed: 0,
      });
    }

    /*
     * Get ALL completed appointments for these customers.
     * This lets us determine whether they returned after
     * the target appointment.
     */
    const customerKeys = [
      ...new Set(
        targetAppointments.map(getCustomerKey)
      ),
    ];

    const { data: allCompleted, error: allError } =
      await supabase
        .from("appointments")
        .select(`
          id,
          barber_id,
          customer_name,
          customer_email,
          customer_phone,
          service,
          date,
          time,
          status,
          secret_link,
          lang
        `)
        .eq("status", "completed")
        .lte("date", new Date().toISOString().split("T")[0]);

    if (allError) {
      console.error(
        "❌ Error loading completed history:",
        allError
      );

      return NextResponse.json(
        {
          success: false,
          error: allError.message,
        },
        { status: 500 }
      );
    }

    /*
     * Find the latest completed appointment for each
     * customer represented in the target-date results.
     */
    const latestCompletedByCustomer = new Map();

    for (const appointment of allCompleted || []) {
      const key = getCustomerKey(appointment);

      if (!customerKeys.includes(key)) {
        continue;
      }

      const existing =
        latestCompletedByCustomer.get(key);

      if (
        !existing ||
        getAppointmentDateTime(appointment) >
          getAppointmentDateTime(existing)
      ) {
        latestCompletedByCustomer.set(
          key,
          appointment
        );
      }
    }

    let sent = 0;
    let skippedAlreadySent = 0;
    let skippedNoValidEmail = 0;
    let skippedReturnedSince = 0;
    let failed = 0;
    let eligibleForEmail = 0;

    for (const appointment of targetAppointments) {
      try {
        /*
         * Check whether the customer has already returned
         * after this 21-day-old appointment.
         */
        const customerKey =
          getCustomerKey(appointment);

        const latestCompleted =
          latestCompletedByCustomer.get(
            customerKey
          );

        if (
          latestCompleted &&
          latestCompleted.id !== appointment.id
        ) {
          skippedReturnedSince++;

          console.log(
            "ℹ️ Customer already returned:",
            appointment.customer_name
          );

          continue;
        }

        /*
         * Check email.
         */
        if (
          !isValidEmail(
            appointment.customer_email
          )
        ) {
          skippedNoValidEmail++;

          console.log(
            "ℹ️ Skipping invalid email:",
            appointment.customer_email
          );

          continue;
        }

        eligibleForEmail++;

        /*
         * Check whether THIS appointment already
         * generated a comeback reminder.
         */
        const {
          data: alreadySent,
          error: sentCheckError,
        } = await supabase
          .from("comeback_reminders")
          .select("id")
          .eq(
            "appointment_id",
            appointment.id
          )
          .maybeSingle();

        if (sentCheckError) {
          console.error(
            "❌ Comeback sent-check error:",
            sentCheckError
          );

          failed++;
          continue;
        }

        if (alreadySent) {
          skippedAlreadySent++;

          console.log(
            "ℹ️ Comeback already sent:",
            appointment.id
          );

          continue;
        }

        /*
         * Barber information
         */
        const { data: barber } =
          await supabase
            .from("barbers")
            .select("name")
            .eq(
              "id",
              appointment.barber_id
            )
            .single();

        const barberName =
          barber?.name || "your barber";

        /*
         * Language
         */
        const lang = getLanguage(
          appointment.lang
        );

        const translatedService =
          SERVICE_TRANSLATIONS[
            appointment.service
          ]?.[lang] ||
          appointment.service;

        /*
         * Booking link
         */
        const baseUrl =
          process.env.BASE_URL ||
          "https://www.flowpaydr.com";

        const bookingLink =
          `${baseUrl}/booking/${appointment.barber_id}?lang=${lang}`;

        const customerName =
          appointment.customer_name ||
          (lang === "es"
            ? "Cliente"
            : "Customer");

        /*
         * Email translations
         */
        const subject =
          lang === "es"
            ? "¿Listo para tu próximo corte? 💈"
            : "Ready for your next appointment? 💈";

        const title =
          lang === "es"
            ? "💈 ¡Es hora de tu próximo corte!"
            : "💈 Time for your next appointment!";

        const greeting =
          lang === "es"
            ? `Hola ${customerName} 👋`
            : `Hi ${customerName} 👋`;

        const bodyText =
          lang === "es"
            ? `Ya han pasado ${COMEBACK_DAYS} días desde tu última visita con ${barberName}.

Tu último servicio fue: ${translatedService}.

¿Listo para tu próxima cita?`
            : `It has been ${COMEBACK_DAYS} days since your last visit with ${barberName}.

Your last service was: ${translatedService}.

Ready for your next appointment?`;

        const buttonText =
          lang === "es"
            ? "Reservar mi próxima cita"
            : "Book my next appointment";

        /*
         * Send email
         */
        await resend.emails.send({
          from: "FlowPayDR <info@flowpaydr.com>",
          to: appointment.customer_email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 550px; margin: auto; border-radius: 14px; background: #ffffff; border: 1px solid #eee;">
              
              <h2 style="text-align:center; margin-bottom: 20px;">
                ${title}
              </h2>

              <p style="font-size: 16px;">
                ${greeting}
              </p>

              <p style="font-size: 15px; line-height: 1.6; white-space: pre-line;">
                ${bodyText}
              </p>

              <div style="background:#f8f8f8; border-radius:10px; padding:15px; margin-top:20px;">
                <p style="margin:0 0 8px;">
                  <strong>
                    ${
                      lang === "es"
                        ? "Último servicio"
                        : "Last service"
                    }:
                  </strong>
                  ${translatedService}
                </p>

                <p style="margin:0;">
                  <strong>
                    ${
                      lang === "es"
                        ? "Barbero"
                        : "Barber"
                    }:
                  </strong>
                  ${barberName}
                </p>
              </div>

              <div style="text-align:center; margin-top:25px;">
                <a
                  href="${bookingLink}"
                  style="background:#2563eb; color:white; padding:13px 22px; border-radius:8px; text-decoration:none; font-size:16px; display:inline-block;"
                >
                  ${buttonText}
                </a>
              </div>

              <p style="margin-top:30px; font-size:12px; text-align:center; color:#666;">
                FlowPayDR • info@flowpaydr.com
              </p>
            </div>
          `,
        });

        console.log(
          "📧 Comeback email sent to:",
          appointment.customer_email
        );

        /*
         * Record successful send.
         */
        const { error: recordError } =
          await supabase
            .from("comeback_reminders")
            .insert({
              appointment_id:
                appointment.id,
            });

        if (recordError) {
          console.error(
            "❌ Comeback record error after email was sent:",
            recordError
          );

          failed++;
          continue;
        }

        sent++;
      } catch (error) {
        failed++;

        console.error(
          "❌ Comeback email failed:",
          appointment.id,
          error
        );
      }
    }

    return NextResponse.json({
      success: true,
      comebackDays: COMEBACK_DAYS,
      targetDate: targetDateString,
      completedAppointmentsFound:
        targetAppointments.length,
      eligibleForEmail,
      sent,
      skippedAlreadySent,
      skippedNoValidEmail,
      skippedReturnedSince,
      failed,
    });
  } catch (error) {
    console.error(
      "❌ Comeback reminder error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Comeback reminder failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  return GET(req);
}