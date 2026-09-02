import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { sendPushToSubscription } from "@/lib/push";
import { sendWhatsAppTemplate } from "@/utils/twilio/twilio";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ======================================================
// ⭐ DOMINICAN REPUBLIC TIME HELPERS
// ======================================================

function getDRDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year =
    parts.find((p) => p.type === "year")?.value || "";

  const month =
    parts.find((p) => p.type === "month")?.value || "";

  const day =
    parts.find((p) => p.type === "day")?.value || "";

  return {
    year,
    month,
    day,
    date: `${year}-${month}-${day}`,
  };
}

function getDRTime() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) =>
    parts.find((p) => p.type === type)?.value || "";

  return new Date(
    `${get("year")}-${get("month")}-${get("day")}T${get(
      "hour"
    )}:${get("minute")}:${get("second")}`
  );
}

function getTomorrowDRDate() {
  const today = getDRDateParts();

  const tomorrow = new Date(
    Date.UTC(
      Number(today.year),
      Number(today.month) - 1,
      Number(today.day) + 1
    )
  );

  return tomorrow.toISOString().split("T")[0];
}

function formatWhatsAppDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatWhatsAppTime(timeString) {
  if (!timeString) return "";

  const [hoursString, minutes] = timeString.split(":");
  let hours = Number(hoursString);

  if (Number.isNaN(hours)) {
    return timeString;
  }

  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${ampm}`;
}

// ======================================================
// ⭐ CHECK WHETHER BOOKING WAS MADE AFTER 8 PM TODAY
// ======================================================

function wasBookedLateForTomorrow(appt, currentDate) {
  if (!appt?.created_at) return false;

  const createdDate = new Date(appt.created_at);

  if (Number.isNaN(createdDate.getTime())) {
    return false;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(createdDate);

  const get = (type) =>
    parts.find((p) => p.type === type)?.value || "";

  const createdLocalDate =
    `${get("year")}-${get("month")}-${get("day")}`;

  const createdHour = Number(get("hour"));

  // Booking must have been created TODAY in DR time
  // and after 8:00 PM.
  return (
    createdLocalDate === currentDate &&
    createdHour >= 20
  );
}

// ======================================================
// ⭐ APPROVED WHATSAPP TEMPLATES
// ======================================================

const WHATSAPP_TEMPLATE_ES =
  "HXfe4159fcb4b427cbddec12ba00fb878a";

const WHATSAPP_TEMPLATE_EN =
  "HX37e32987ffc5518dea06b2dd66609aee";

// ======================================================
// ⭐ MAIN REMINDER JOB
// ======================================================

export async function GET(req) {
  const cronSecret = process.env.CRON_SECRET;
  const requestSecret = req.headers.get("x-cron-secret");

  if (!cronSecret || requestSecret !== cronSecret) {
    console.warn("⛔ Unauthorized reminder request");

    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  console.log("🚀 Reminder job started");
  const now = getDRTime();

  const currentDR = getDRDateParts();
  const currentDate = currentDR.date;
  const currentTime = now.toTimeString().slice(0, 8);

  const twoHours = new Date(
    now.getTime() + 120 * 60000
  );

  const twoHoursTime =
    twoHours.toTimeString().slice(0, 8);

  console.log(
    "⏱ DR Window:",
    currentTime,
    "→",
    twoHoursTime
  );

  // ======================================================
  // ⭐ EXISTING 2-HOUR EMAIL + PUSH REMINDERS
  // ======================================================

  const {
    data: appointments,
    error,
  } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", currentDate)
    .eq("status", "confirmed")
    .gte("time", currentTime)
    .lte("time", twoHoursTime)
    .is("reminder_sent", null);

  if (error) {
    console.error(
      "❌ Supabase error:",
      error.message
    );

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (appointments && appointments.length > 0) {
    console.log(
      "📌 Appointments found for email/push:",
      appointments.length
    );

    for (const appt of appointments) {
      try {
        const apptTime = appt.time;

        // --------------------------------------------------
        // BARBER
        // --------------------------------------------------

        const { data: barber } = await supabase
          .from("barbers")
          .select("name")
          .eq("id", appt.barber_id)
          .single();

        const barberName =
          barber?.name || "your barber";

        // --------------------------------------------------
        // LANGUAGE
        // --------------------------------------------------

        const isSpanish =
          appt.lang?.toUpperCase() === "ES";

        const msgEN =
          `You have an appointment today at ${apptTime} with barber ${barberName}.`;

        const msgES =
          `Tienes una cita hoy a las ${apptTime} con el barbero ${barberName}.`;

        const finalMessage =
          isSpanish ? msgES : msgEN;

        const subject = isSpanish
          ? `Recordatorio de Cita (${apptTime})`
          : `Appointment Reminder (${apptTime})`;

        // --------------------------------------------------
        // EMAIL
        // --------------------------------------------------

        let emailSent = false;

        if (appt.customer_email) {
          try {
            const { error: emailError } =
              await resend.emails.send({
                from:
                  "FlowPayDR <info@flowpaydr.com>",
                to: appt.customer_email,
                subject,
                text: finalMessage,
              });

            if (emailError) {
              console.error(
                "❌ Email reminder error:",
                emailError
              );
            } else {
              emailSent = true;

              console.log(
                "📧 Email reminder sent to:",
                appt.customer_email
              );
            }
          } catch (emailErr) {
            console.error(
              "❌ Email exception:",
              emailErr
            );
          }
        } else {
          console.log(
            "ℹ️ No email for appointment:",
            appt.id
          );
        }

        // --------------------------------------------------
        // PUSH
        // --------------------------------------------------

        try {
          const { data: tokens } =
            await supabase
              .from("push_tokens")
              .select("subscription")
              .eq(
                "user_id",
                appt.secret_link
              )
              .eq(
                "role",
                "customer"
              );

          if (!tokens || tokens.length === 0) {
            console.log(
              "ℹ️ No push tokens for customer:",
              appt.secret_link
            );
          }

          for (const t of tokens || []) {
            await sendPushToSubscription(
              t.subscription,
              {
                title: isSpanish
                  ? "Recordatorio de Cita"
                  : "Appointment Reminder",
                message: finalMessage,
              }
            );
          }

          console.log(
            "📲 Push reminder sent:",
            tokens?.length || 0
          );
        } catch (pushErr) {
          console.error(
            "❌ Push reminder error:",
            pushErr
          );
        }

        // --------------------------------------------------
        // MARK EXISTING REMINDER AS SENT
        // --------------------------------------------------

        if (
          emailSent ||
          !appt.customer_email
        ) {
          const { error: updateError } =
            await supabase
              .from("appointments")
              .update({
                reminder_sent: true,
              })
              .eq("id", appt.id);

          if (updateError) {
            console.error(
              "❌ Failed to mark reminder_sent:",
              updateError.message
            );
          }
        }
      } catch (err) {
        console.error(
          "❌ Existing reminder error:",
          err
        );
      }
    }
  } else {
    console.log(
      "ℹ️ No email/push reminders to send"
    );
  }

  // ======================================================
  // ⭐ WHATSAPP REMINDER — TOMORROW
  //
  // Normal:
  // Send during the 8:00–8:14 PM DR window.
  //
  // Late booking:
  // If someone books tomorrow's appointment after
  // 8:00 PM today, send it on the next 15-minute cron run.
  // ======================================================

  const tomorrowDate =
    getTomorrowDRDate();

  console.log(
    "💬 WhatsApp reminder date:",
    tomorrowDate
  );

  const drHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santo_Domingo",
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );

  const drMinute = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santo_Domingo",
      minute: "numeric",
      hour12: false,
    }).format(new Date())
  );

  const isDailyWhatsAppWindow =
    drHour === 20 &&
    drMinute < 15;

  console.log(
    "🕗 WhatsApp daily window:",
    isDailyWhatsAppWindow
  );

  // ------------------------------------------------------
  // LOAD TOMORROW'S CONFIRMED APPOINTMENTS
  // ------------------------------------------------------

  const {
  data: whatsappAppointments,
  error: whatsappQueryError,
} = await supabase
  .from("appointments")
  .select("*")
  .eq("date", tomorrowDate)
  .eq("status", "confirmed")
  .eq("whatsapp_reminder_sent", false);

  if (whatsappQueryError) {
    console.error(
      "❌ WhatsApp reminder query error:",
      whatsappQueryError.message
    );

    return NextResponse.json(
      {
        success: false,
        error: whatsappQueryError.message,
      },
      { status: 500 }
    );
  }

  console.log(
    "📌 Tomorrow appointments found:",
    whatsappAppointments?.length || 0
  );

  let whatsappSent = 0;
  let whatsappSkipped = 0;
  let whatsappFailed = 0;

  // ======================================================
  // ⭐ PROCESS WHATSAPP REMINDERS
  // ======================================================

  for (const appt of whatsappAppointments || []) {
    try {
      // --------------------------------------------------
      // DECIDE IF THIS APPOINTMENT SHOULD RECEIVE NOW
      // --------------------------------------------------

      const lateTomorrowBooking =
        wasBookedLateForTomorrow(
          appt,
          currentDate
        );

      const shouldSendWhatsApp =
        isDailyWhatsAppWindow ||
        lateTomorrowBooking;

      if (!shouldSendWhatsApp) {
        continue;
      }

      console.log(
        "📨 WhatsApp eligible:",
        appt.customer_name,
        lateTomorrowBooking
          ? "(late booking)"
          : "(daily 8 PM reminder)"
      );

      // --------------------------------------------------
      // PHONE CHECK
      // --------------------------------------------------

      if (!appt.customer_phone) {
        console.log(
          "ℹ️ No WhatsApp number:",
          appt.customer_name || appt.id
        );

        whatsappSkipped++;
        continue;
      }

      // --------------------------------------------------
      // BARBER
      // --------------------------------------------------

      const { data: barber } =
        await supabase
          .from("barbers")
          .select("name")
          .eq("id", appt.barber_id)
          .single();

      const barberName =
        barber?.name || "your barber";

      // --------------------------------------------------
      // LANGUAGE
      // --------------------------------------------------

      const isSpanish =
        appt.lang?.toUpperCase() === "ES";

      const contentSid = isSpanish
        ? WHATSAPP_TEMPLATE_ES
        : WHATSAPP_TEMPLATE_EN;

      // --------------------------------------------------
      // TEMPLATE VARIABLES
      // --------------------------------------------------

      const variables = {
        "1":
          appt.customer_name ||
          "Cliente",

        "2":
          barberName,

        "3":
          formatWhatsAppDate(
            tomorrowDate
          ),

        "4":
          formatWhatsAppTime(
            appt.time
          ),
      };

      // --------------------------------------------------
      // SEND APPROVED WHATSAPP TEMPLATE
      // --------------------------------------------------

      const result =
        await sendWhatsAppTemplate(
          appt.customer_phone,
          contentSid,
          variables
        );

      console.log(
        "✅ WhatsApp reminder sent:",
        appt.customer_phone,
        result?.sid || ""
      );

      // --------------------------------------------------
      // MARK AS SENT ONLY AFTER TWILIO SUCCESS
      // --------------------------------------------------

      const { error: updateError } =
        await supabase
          .from("appointments")
          .update({
            whatsapp_reminder_sent: true,
          })
          .eq("id", appt.id);

      if (updateError) {
        console.error(
          "⚠️ WhatsApp sent, but failed to mark appointment:",
          updateError.message
        );
      }

      whatsappSent++;
    } catch (err) {
      whatsappFailed++;

      console.error(
        "❌ WhatsApp reminder error:",
        appt.customer_phone,
        err?.message || err
      );
    }
  }

  // ======================================================
  // ⭐ FINAL RESPONSE
  // ======================================================

  return NextResponse.json({
    success: true,

    message:
      "Email + Push + WhatsApp reminders processed",

    emailPushAppointments:
      appointments?.length || 0,

    whatsappAppointmentsFound:
      whatsappAppointments?.length || 0,

    whatsappSent,
    whatsappSkipped,
    whatsappFailed,

    whatsappDailyWindow:
      isDailyWhatsAppWindow,

    whatsappReminderDate:
      tomorrowDate,
  });
}

// ======================================================
// ⭐ POST SUPPORT FOR CRON-JOB.ORG
// ======================================================

export async function POST(req) {
  return GET(req);
}