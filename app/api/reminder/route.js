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
// ⭐ WHATSAPP PHONE NORMALIZER
// ======================================================

function normalizeWhatsAppPhone(phone) {
  if (!phone) return null;

  const raw = String(phone).trim();

  const digits = raw.replace(/\D/g, "");

  // US / Dominican number already includes country code 1
  // 18098817874 -> +18098817874
  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return `+${digits}`;
  }

  // Dominican / US local 10-digit number
  // 8098817874 -> +18098817874
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Other international numbers without "+"
  if (
    digits.length >= 11 &&
    digits.length <= 15
  ) {
    return `+${digits}`;
  }

  return null;
}

// ======================================================
// ⭐ CHECK WHETHER BOOKING WAS MADE AFTER 8 PM TODAY
// ======================================================

function wasBookedLateForTomorrow(
  appt,
  currentDate
) {
  if (!appt?.created_at) return false;

  const createdDate =
    new Date(appt.created_at);

  if (
    Number.isNaN(
      createdDate.getTime()
    )
  ) {
    return false;
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Santo_Domingo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).formatToParts(
      createdDate
    );

  const get = (type) =>
    parts.find(
      (p) => p.type === type
    )?.value || "";

  const createdLocalDate =
    `${get("year")}-${get(
      "month"
    )}-${get("day")}`;

  const createdHour =
    Number(
      get("hour")
    );

  return (
    createdLocalDate ===
      currentDate &&
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

// Tour reminder templates
const WHATSAPP_TOUR_TEMPLATE_ES =
  "HXf03b16c0d65da7eb24a9a6852b4b20bc";

const WHATSAPP_TOUR_TEMPLATE_EN =
  "HX1d4300466612b35a0168edc014a0597a";

// ======================================================
// ⭐ MAIN REMINDER JOB
// ======================================================

export async function GET(req) {
  const cronSecret =
    process.env.CRON_SECRET;

  const requestSecret =
    req.headers.get(
      "x-cron-secret"
    );

  if (
    !cronSecret ||
    requestSecret !== cronSecret
  ) {
    console.warn(
      "⛔ Unauthorized reminder request"
    );

    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  // ====================================================
  // ⭐ TOP-LEVEL SAFETY WRAPPER
  // ====================================================

  try {
    console.log(
      "🚀 Reminder job started"
    );

    const jobStartedAt =
      new Date().toISOString();

    const now =
      getDRTime();

    const currentDR =
      getDRDateParts();

    const currentDate =
      currentDR.date;

    const currentTime =
      now
        .toTimeString()
        .slice(
          0,
          8
        );

    const twoHours =
      new Date(
        now.getTime() +
          120 * 60000
      );

    const twoHoursTime =
      twoHours
        .toTimeString()
        .slice(
          0,
          8
        );

    console.log(
      "⏱ DR Window:",
      currentTime,
      "→",
      twoHoursTime
    );

    // ==================================================
    // ⭐ STATUS TRACKING
    // ==================================================

    let emailPushStatus =
      "ok";

    let emailPushError =
      null;

    let whatsappStatus =
      "ok";

    let whatsappQueryErrorMessage =
      null;

    let appointments = [];

    // ==================================================
    // ⭐ EXISTING 2-HOUR EMAIL + PUSH REMINDERS
    // ==================================================

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "appointments"
          )
          .select("*")
          .eq(
            "date",
            currentDate
          )
          .eq(
            "status",
            "confirmed"
          )
          .gte(
            "time",
            currentTime
          )
          .lte(
            "time",
            twoHoursTime
          )
          .is(
            "reminder_sent",
            null
          );

      if (error) {
        emailPushStatus =
          "error";

        emailPushError =
          error.message;

        console.error(
          "❌ Email/push Supabase query error:",
          error.message
        );
      } else {
        appointments =
          data || [];
      }
    } catch (queryErr) {
      emailPushStatus =
        "error";

      emailPushError =
        queryErr?.message ||
        String(
          queryErr
        );

      console.error(
        "❌ Email/push query exception:",
        queryErr
      );
    }

    // ==================================================
    // ⭐ PROCESS EMAIL + PUSH
    // ==================================================

    if (
      appointments.length > 0
    ) {
      console.log(
        "📌 Appointments found for email/push:",
        appointments.length
      );

      for (
        const appt of appointments
      ) {
        try {
          const apptTime =
            appt.time;

          // ----------------------------------------------
          // BARBER / PROVIDER
          // ----------------------------------------------

          let professionalName =
            "";

          let isProviderAppointment =
            false;

          if (
            appt.provider_id
          ) {
            isProviderAppointment =
              true;

            const {
              data: provider,
            } =
              await supabase
                .from(
                  "providers"
                )
                .select(
                  "name"
                )
                .eq(
                  "id",
                  appt.provider_id
                )
                .maybeSingle();

            professionalName =
              provider?.name ||
              "your professional";
          } else if (
            appt.barber_id
          ) {
            const {
              data: barber,
            } =
              await supabase
                .from(
                  "barbers"
                )
                .select(
                  "name"
                )
                .eq(
                  "id",
                  appt.barber_id
                )
                .maybeSingle();

            professionalName =
              barber?.name ||
              "your barber";
          } else {
            professionalName =
              "your professional";
          }

          // ----------------------------------------------
          // LANGUAGE
          // ----------------------------------------------

          const isSpanish =
            appt.lang
              ?.toUpperCase() ===
            "ES";

          const formattedTime =
            formatWhatsAppTime(
              apptTime
            );

          const msgEN =
            isProviderAppointment
              ? `You have an appointment today at ${formattedTime} with ${professionalName}.`
              : `You have an appointment today at ${formattedTime} with barber ${professionalName}.`;

          const msgES =
            isProviderAppointment
              ? `Tienes una cita hoy a las ${formattedTime} con ${professionalName}.`
              : `Tienes una cita hoy a las ${formattedTime} con el barbero ${professionalName}.`;

          const finalMessage =
            isSpanish
              ? msgES
              : msgEN;

          const subject =
            isSpanish
              ? `Recordatorio de Cita (${formattedTime})`
              : `Appointment Reminder (${formattedTime})`;

          // ----------------------------------------------
          // EMAIL
          // ----------------------------------------------

          let emailSent =
            false;

          if (
            appt.customer_email
          ) {
            try {
              const {
                error:
                  emailError,
              } =
                await resend.emails.send(
                  {
                    from:
                      "FlowPayDR <info@flowpaydr.com>",
                    to:
                      appt.customer_email,
                    subject,
                    text:
                      finalMessage,
                  }
                );

              if (
                emailError
              ) {
                console.error(
                  "❌ Email reminder error:",
                  emailError
                );
              } else {
                emailSent =
                  true;

                console.log(
                  "📧 Email reminder sent to:",
                  appt.customer_email
                );
              }
            } catch (
              emailErr
            ) {
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

          // ----------------------------------------------
          // PUSH
          // ----------------------------------------------

          try {
            const {
              data: tokens,
            } =
              await supabase
                .from(
                  "push_tokens"
                )
                .select(
                  "subscription"
                )
                .eq(
                  "user_id",
                  appt.secret_link
                )
                .eq(
                  "role",
                  "customer"
                );

            if (
              !tokens ||
              tokens.length === 0
            ) {
              console.log(
                "ℹ️ No push tokens for customer:",
                appt.secret_link
              );
            }

            for (
              const t of
              tokens || []
            ) {
              await sendPushToSubscription(
                t.subscription,
                {
                  title:
                    isSpanish
                      ? "Recordatorio de Cita"
                      : "Appointment Reminder",

                  message:
                    finalMessage,
                }
              );
            }

            console.log(
              "📲 Push reminder sent:",
              tokens?.length ||
                0
            );
          } catch (
            pushErr
          ) {
            console.error(
              "❌ Push reminder error:",
              pushErr
            );
          }

          // ----------------------------------------------
          // MARK EXISTING REMINDER AS SENT
          // ----------------------------------------------

          if (
            emailSent ||
            !appt.customer_email
          ) {
            const {
              error:
                updateError,
            } =
              await supabase
                .from(
                  "appointments"
                )
                .update({
                  reminder_sent:
                    true,
                })
                .eq(
                  "id",
                  appt.id
                );

            if (
              updateError
            ) {
              console.error(
                "❌ Failed to mark reminder_sent:",
                updateError.message
              );
            }
          }
        } catch (
          err
        ) {
          console.error(
            "❌ Existing reminder error:",
            err
          );
        }
      }
    } else {
      console.log(
        emailPushStatus ===
          "error"
          ? "⚠️ Email/push section skipped because query failed"
          : "ℹ️ No email/push reminders to send"
      );
    }

    // ==================================================
    // ⭐ WHATSAPP REMINDER — TOMORROW
    //
    // Normal:
    // 7:00 PM through 9:59 PM DR time
    //
    // Late booking:
    // Appointment created after 8 PM for tomorrow
    // ==================================================

    const tomorrowDate =
      getTomorrowDRDate();

    console.log(
      "💬 WhatsApp reminder date:",
      tomorrowDate
    );

    const drHour =
      Number(
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone:
              "America/Santo_Domingo",
            hour:
              "numeric",
            hour12:
              false,
          }
        ).format(
          new Date()
        )
      );

    const drMinute =
      Number(
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone:
              "America/Santo_Domingo",
            minute:
              "numeric",
            hour12:
              false,
          }
        ).format(
          new Date()
        )
      );

    const isDailyWhatsAppWindow =
      drHour >= 19 &&
      drHour <= 21;

    console.log(
      "🕗 WhatsApp daily window:",
      isDailyWhatsAppWindow,
      `DR time: ${drHour}:${String(
        drMinute
      ).padStart(
        2,
        "0"
      )}`
    );

    // ==================================================
    // ⭐ LOAD TOMORROW'S WHATSAPP APPOINTMENTS
    // ==================================================

    let whatsappAppointments =
      [];

    try {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "appointments"
          )
          .select("*")
          .eq(
            "date",
            tomorrowDate
          )
          .eq(
            "status",
            "confirmed"
          )
          .eq(
            "whatsapp_reminder_sent",
            false
          );

      if (error) {
        whatsappStatus =
          "error";

        whatsappQueryErrorMessage =
          error.message;

        console.error(
          "❌ WhatsApp reminder query error:",
          error.message
        );
      } else {
        whatsappAppointments =
          data || [];
      }
    } catch (
      whatsappQueryErr
    ) {
      whatsappStatus =
        "error";

      whatsappQueryErrorMessage =
        whatsappQueryErr?.message ||
        String(
          whatsappQueryErr
        );

      console.error(
        "❌ WhatsApp reminder query exception:",
        whatsappQueryErr
      );
    }

    console.log(
      "📌 Tomorrow appointments found:",
      whatsappAppointments.length
    );

    let whatsappSent =
      0;

    let whatsappSkipped =
      0;

    let whatsappFailed =
      0;

    const whatsappFailures =
      [];

    // ==================================================
    // ⭐ PROCESS WHATSAPP REMINDERS
    // ==================================================

    if (
      whatsappStatus ===
      "ok"
    ) {
      for (
        const appt of
        whatsappAppointments
      ) {
        try {
          // ----------------------------------------------
          // SHOULD SEND NOW?
          // ----------------------------------------------

          const lateTomorrowBooking =
            wasBookedLateForTomorrow(
              appt,
              currentDate
            );

          const shouldSendWhatsApp =
            isDailyWhatsAppWindow ||
            lateTomorrowBooking;

          if (
            !shouldSendWhatsApp
          ) {
            continue;
          }

          console.log(
            "📨 WhatsApp eligible:",
            appt.customer_name,
            lateTomorrowBooking
              ? "(late booking)"
              : "(daily reminder window)"
          );

          // ----------------------------------------------
          // PHONE CHECK + NORMALIZATION
          // ----------------------------------------------

          if (
            !appt.customer_phone
          ) {
            console.log(
              "ℹ️ No WhatsApp number:",
              appt.customer_name ||
                appt.id
            );

            whatsappSkipped++;

            continue;
          }

          const normalizedPhone =
            normalizeWhatsAppPhone(
              appt.customer_phone
            );

          if (
            !normalizedPhone
          ) {
            throw new Error(
              `Invalid phone number format: ${appt.customer_phone}`
            );
          }

          console.log(
            "📞 WhatsApp phone normalized:",
            appt.customer_phone,
            "→",
            normalizedPhone
          );

          // ----------------------------------------------
          // BUSINESS / TOUR DETECTION
          // ----------------------------------------------

          let businessName = "";
          let businessCategory = "";

          if (appt.business_id) {
            const {
              data: business,
              error: businessError,
            } = await supabase
              .from("businesses")
              .select("name, category")
              .eq("id", appt.business_id)
              .maybeSingle();

            if (businessError) {
              console.error(
                "⚠️ Business lookup error:",
                businessError.message
              );
            }

            businessName = business?.name || "";
            businessCategory = business?.category || "";
          }

          const normalizedBusinessCategory =
            String(businessCategory)
              .trim()
              .toLowerCase();

          const isTourAppointment =
            normalizedBusinessCategory.includes("tour") ||
            normalizedBusinessCategory.includes("excursion") ||
            normalizedBusinessCategory.includes("excursión");

          // ----------------------------------------------
          // BARBER / PROVIDER
          // ----------------------------------------------

          let professionalName = "";

          if (appt.provider_id) {
            const {
              data: provider,
            } = await supabase
              .from("providers")
              .select("name")
              .eq("id", appt.provider_id)
              .maybeSingle();

            professionalName =
              provider?.name ||
              "your professional";
          } else if (appt.barber_id) {
            const {
              data: barber,
            } = await supabase
              .from("barbers")
              .select("name")
              .eq("id", appt.barber_id)
              .maybeSingle();

            professionalName =
              barber?.name ||
              "your barber";
          } else {
            professionalName =
              "your professional";
          }

          // ----------------------------------------------
          // LANGUAGE
          // ----------------------------------------------

          const isSpanish =
            appt.lang?.toUpperCase() === "ES";

          // ----------------------------------------------
          // TEMPLATE + VARIABLES
          // ----------------------------------------------

          let contentSid;
          let variables;

          if (isTourAppointment) {
            if (!businessName) {
              throw new Error(
                `Tour appointment ${appt.id} is missing a business name`
              );
            }

            if (!appt.service) {
              throw new Error(
                `Tour appointment ${appt.id} is missing a tour/service name`
              );
            }

            if (
              !appt.guest_count ||
              Number(appt.guest_count) < 1
            ) {
              throw new Error(
                `Tour appointment ${appt.id} is missing a valid guest_count`
              );
            }

            if (!appt.pickup_location) {
              throw new Error(
                `Tour appointment ${appt.id} is missing pickup_location`
              );
            }

            contentSid =
              isSpanish
                ? WHATSAPP_TOUR_TEMPLATE_ES
                : WHATSAPP_TOUR_TEMPLATE_EN;

            variables = {
              "1":
                appt.customer_name ||
                (isSpanish
                  ? "Cliente"
                  : "Customer"),

              "2":
                businessName,

              "3":
                appt.service,

              "4":
                formatWhatsAppDate(
                  tomorrowDate
                ),

              "5":
                formatWhatsAppTime(
                  appt.time
                ),

              "6":
                String(
                  appt.guest_count
                ),

              "7":
                String(
                  appt.pickup_location
                ),
            };

            console.log(
              "🌴 Tour WhatsApp reminder:",
              {
                appointmentId:
                  appt.id,
                businessName,
                tour:
                  appt.service,
                guests:
                  appt.guest_count,
                pickupLocation:
                  appt.pickup_location,
                language:
                  isSpanish
                    ? "ES"
                    : "EN",
              }
            );
          } else {
            // Existing barber/provider reminder
            contentSid =
              isSpanish
                ? WHATSAPP_TEMPLATE_ES
                : WHATSAPP_TEMPLATE_EN;

            variables = {
              "1":
                appt.customer_name ||
                "Cliente",

              "2":
                professionalName,

              "3":
                formatWhatsAppDate(
                  tomorrowDate
                ),

              "4":
                formatWhatsAppTime(
                  appt.time
                ),
            };
          }

          // ----------------------------------------------
          // SEND WHATSAPP
          // ----------------------------------------------

          const result =
            await sendWhatsAppTemplate(
              normalizedPhone,
              contentSid,
              variables
            );

          console.log(
            "✅ WhatsApp reminder accepted by Twilio:",
            normalizedPhone,
            result?.sid ||
              ""
          );

          // ----------------------------------------------
          // MARK AS SENT ONLY AFTER TWILIO ACCEPTS
          // ----------------------------------------------

          const {
            error:
              updateError,
          } =
            await supabase
              .from(
                "appointments"
              )
              .update({
                whatsapp_reminder_sent:
                  true,
              })
              .eq(
                "id",
                appt.id
              );

          if (
            updateError
          ) {
            console.error(
              "⚠️ WhatsApp accepted, but failed to mark appointment:",
              updateError.message
            );
          }

          whatsappSent++;
        } catch (
          err
        ) {
          whatsappFailed++;

          const failure =
            {
              appointmentId:
                appt.id,

              customerName:
                appt.customer_name ||
                "",

              customerPhone:
                appt.customer_phone ||
                "",

              normalizedPhone:
                normalizeWhatsAppPhone(
                  appt.customer_phone
                ),

              language:
                appt.lang ||
                "",

              errorCode:
                err?.code ??
                err?.statusCode ??
                err?.status ??
                null,

              errorStatus:
                err?.status ??
                err?.statusCode ??
                null,

              errorMessage:
                err?.message ||
                String(
                  err
                ),

              moreInfo:
                err?.moreInfo ||
                err?.more_info ||
                null,
            };

          whatsappFailures.push(
            failure
          );

          console.error(
            "❌ WhatsApp reminder error:",
            failure
          );
        }
      }
    } else {
      console.log(
        "⚠️ WhatsApp processing skipped because the appointment query failed"
      );
    }

    // ==================================================
    // ⭐ FINAL DIAGNOSTIC RESPONSE
    // ==================================================

    const allSectionsOk =
      emailPushStatus ===
        "ok" &&
      whatsappStatus ===
        "ok";

    const jobFinishedAt =
      new Date().toISOString();

    return NextResponse.json(
      {
        success:
          allSectionsOk,

        message:
          allSectionsOk
            ? "Email + Push + WhatsApp reminders processed"
            : "Reminder job completed with one or more section errors",

        jobStartedAt,
        jobFinishedAt,

        drDate:
          currentDate,

        emailPushStatus,
        emailPushError,

        emailPushAppointments:
          appointments.length,

        whatsappStatus,

        whatsappQueryError:
          whatsappQueryErrorMessage,

        whatsappAppointmentsFound:
          whatsappAppointments.length,

        whatsappSent,
        whatsappSkipped,
        whatsappFailed,

        whatsappFailures,

        whatsappDailyWindow:
          isDailyWhatsAppWindow,

        whatsappReminderDate:
          tomorrowDate,
      },
      {
        // Important:
        // Section-level transient errors return 200 so
        // cron-job.org does not mark the whole execution
        // as failed. Diagnostics are still included above.
        status: 200,
      }
    );
  } catch (
    fatalError
  ) {
    // ==================================================
    // ⭐ UNEXPECTED FATAL ERROR
    // ==================================================

    console.error(
      "💥 Fatal reminder route error:",
      fatalError
    );

    return NextResponse.json(
      {
        success:
          false,

        fatal:
          true,

        error:
          fatalError?.message ||
          String(
            fatalError
          ),

        timestamp:
          new Date().toISOString(),
      },
      {
        status: 500,
      }
    );
  }
}

// ======================================================
// ⭐ POST SUPPORT FOR CRON-JOB.ORG
// ======================================================

export async function POST(
  req
) {
  return GET(
    req
  );
}