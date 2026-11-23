import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { sendPushToSubscription } from "@/lib/push";
import { sendWhatsAppTemplate } from "@/utils/twilio/twilio";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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

function getBusinessLocalDateTime(
  timezone = "America/Santo_Domingo",
  date = new Date()
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function getPreviousCalendarDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(
    Date.UTC(year, month - 1, day - 1)
  ).toISOString().slice(0, 10);
}
function getNextCalendarDate(dateString) {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(
    Date.UTC(year, month - 1, day + 1)
  ).toISOString().slice(0, 10);
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
  currentDate,
  timezone = "America/Santo_Domingo"
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
        timeZone: timezone,
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
// APPROVED WHATSAPP REMINDER TEMPLATES
// ======================================================

const WHATSAPP_TEMPLATE_ES =
  "HX7d286d27a22d7bc3ee897853fd307bf1";

const WHATSAPP_TEMPLATE_EN =
  "HX091df12c89d884d6e398e0d4fb826056";

// Tour reminder templates
const WHATSAPP_TOUR_TEMPLATE_ES =
  "HXf03b16c0d65da7eb24a9a6852b4b20bc";

const WHATSAPP_TOUR_TEMPLATE_EN =
  "HX1d4300466612b35a0168edc014a0597a";

// ======================================================
// ⭐ MAIN REMINDER JOB
// ======================================================


function buildGroupReminderHtml(appointments, businessName, lang = "es", professionalName = "") {
  const spanish = String(lang || "es").toLowerCase() !== "en";
  const ordered = [...appointments].sort((a, b) =>
    String(a.date + " " + a.time).localeCompare(String(b.date + " " + b.time))
  );

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;",
    })[char]);

  const formatTime = (value) => {
    const [hour, minute] = String(value || "0:00").split(":").map(Number);
    return (hour % 12 || 12) + ":" +
      String(minute || 0).padStart(2, "0") +
      (hour >= 12 ? " PM" : " AM");
  };

  const formatDate = (value) => {
    const parts = String(value || "").split("-");
    return parts.length === 3
      ? parts[2] + "/" + parts[1] + "/" + parts[0]
      : String(value || "");
  };

  const first = ordered[0] || {};
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.flowpaydr.com").replace(/\/$/, "");

  const rows = ordered.map((appt) => {
    const link = baseUrl + "/customer/" +
      encodeURIComponent(appt.secret_link || "");

    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e5e5;">
          <strong>${escapeHtml(appt.customer_name)}</strong>
          <div style="color:#555;margin-top:4px;">
            ${escapeHtml(appt.service)}
          </div>
          <div style="margin-top:4px;">
            ${escapeHtml(formatTime(appt.time))}
          </div>
          ${appt.secret_link ? `
            <a href="${escapeHtml(link)}"
              style="display:inline-block;margin-top:8px;color:#9b741d;">
              ${spanish ? "Ver o gestionar cita" : "View or manage appointment"}
            </a>` : ""}
        </td>
      </tr>`;
  }).join("");

  const heading = spanish
    ? "Recordatorio de tu reserva de grupo"
    : "Group Booking Reminder";

  const greeting = spanish ? "Hola" : "Hello";
  const introduction = spanish
    ? "Te recordamos que tienes una reserva de grupo programada para hoy."
    : "This is a reminder that your group booking is scheduled for today.";

  return `
<!DOCTYPE html>
<html lang="${spanish ? "es" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:24px 12px;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#171717;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
    style="width:100%;max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:14px;">
    <tr>
      <td align="center" style="background-color:#101010;padding:24px;border-radius:14px 14px 0 0;">
        <img src="https://www.flowpaydr.com/FlowPayDR%20Booking%20Gold%20Logo.png"
          alt="FlowPayDR Booking" width="190"
          style="display:block;width:190px;max-width:100%;height:auto;border:0;">
      </td>
    </tr>
    <tr>
      <td style="padding:30px 26px;">
        <h1 style="font-size:24px;margin:0 0 20px;color:#171717;">
          ${heading}
        </h1>
        <p style="font-size:16px;line-height:1.6;">
          ${greeting} ${escapeHtml(first.customer_name)},
        </p>
        <p style="font-size:15px;line-height:1.7;color:#444444;">
          ${introduction}
        </p>
        <table role="presentation" cellpadding="10" cellspacing="0" border="0"
          style="width:100%;background-color:#f7f7f7;border-radius:8px;font-size:14px;">
          <tr>
            <td><strong>${spanish ? "Negocio" : "Business"}</strong></td>
            <td>${escapeHtml(businessName || "FlowPayDR Booking")}</td>
          </tr>
          ${professionalName ? `
          <tr>
            <td><strong>${spanish ? "Profesional" : "Professional"}</strong></td>
            <td>${escapeHtml(professionalName)}</td>
          </tr>` : ""}
          <tr>
            <td><strong>${spanish ? "Fecha" : "Date"}</strong></td>
            <td>${escapeHtml(formatDate(first.date))}</td>
          </tr>
        </table>
        <h2 style="font-size:18px;margin:26px 0 12px;">
          ${spanish ? "Citas del grupo" : "Group appointments"}
        </h2>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"
          style="width:100%;border-collapse:collapse;font-size:14px;">
          ${rows}
        </table>
        <p style="font-size:16px;margin-top:26px;">
          ${spanish ? "¡Te esperamos!" : "We look forward to seeing you!"}
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:18px;background-color:#f7f7f7;border-radius:0 0 14px 14px;font-size:12px;color:#777777;">
        ${spanish
          ? "Recordatorio automático de FlowPayDR Booking."
          : "Automated reminder from FlowPayDR Booking."}
      </td>
    </tr>
  </table>
</body>
</html>`;
}
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

    const currentDR = getDRDateParts();
    const currentDate = currentDR.date;

    // Business-specific timezone filtering happens below.
    console.log("Checking email reminders using each business timezone");
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
    // EMAIL + PUSH: BUSINESS TIMEZONE
    // ==================================================

    try {
      const nowUtc = new Date();
      const candidateDates = new Set();

      for (const timezone of [
        "America/Santo_Domingo",
        "America/New_York",
        "Pacific/Honolulu",
        "Pacific/Kiritimati",
      ]) {
        const local = getBusinessLocalDateTime(timezone, nowUtc);
        candidateDates.add(getPreviousCalendarDate(local.date));
        candidateDates.add(local.date);
        candidateDates.add(getNextCalendarDate(local.date));
      }

      const dates = [...candidateDates].sort();

      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .gte("date", dates[0])
        .lte("date", dates[dates.length - 1])
        .eq("status", "confirmed")
        .is("reminder_sent", null);

      if (error) {
        emailPushStatus = "error";
        emailPushError = error.message;
        console.error("Email/push query error:", error.message);
      } else {
        const candidates = data || [];
        const businessIds = [
          ...new Set(candidates.map(a => a.business_id).filter(Boolean)),
        ];

        const timezoneByBusiness = new Map();

        if (businessIds.length > 0) {
          const { data: businesses, error: businessError } = await supabase
            .from("businesses")
            .select("id, timezone")
            .in("id", businessIds);

          if (businessError) {
            throw businessError;
          }

          for (const business of businesses || []) {
            timezoneByBusiness.set(
              business.id,
              business.timezone || "America/Santo_Domingo"
            );
          }
        }

        appointments = candidates.filter(appt => {
          const timezone =
            timezoneByBusiness.get(appt.business_id) ||
            "America/Santo_Domingo";

          try {
            const localNow = getBusinessLocalDateTime(timezone, nowUtc);
            const [hours, minutes] = String(appt.time || "")
              .split(":")
              .map(Number);

            if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
              return false;
            }

            const localToday = new Date(
              `${localNow.date}T00:00:00Z`
            ).getTime();

            const appointmentDay = new Date(
              `${appt.date}T00:00:00Z`
            ).getTime();

            const dayDifference =
              Math.round((appointmentDay - localToday) / 86400000);

            const minutesUntil =
              dayDifference * 1440 +
              hours * 60 +
              minutes -
              (localNow.hour * 60 + localNow.minute);

            return minutesUntil > 0 && minutesUntil <= 120;
          } catch (timezoneError) {
            console.error(
              "Invalid business timezone for appointment:",
              appt.id,
              timezoneError.message
            );
            return false;
          }
        });
      }
    } catch (queryErr) {
      emailPushStatus = "error";
      emailPushError = queryErr?.message || String(queryErr);
      console.error("Email/push query exception:", emailPushError);
    }

    // ==================================================    // ==================================================
    // ⭐ PROCESS EMAIL + PUSH
    // ==================================================

    if (
      appointments.length > 0
    ) {
      console.log(
        "📌 Appointments found for email/push:",
        appointments.length
      );
      const processedEmailGroups = new Set();


      for (
        const appt of appointments
      ) {
        try {
          const isGroupAppointment = Boolean(appt.group_id);


          // GROUP BOOKING: COMBINED EMAIL + PUSH
          if (isGroupAppointment) {
            const groupId = appt.group_id;

            const { data: groupMembers, error: groupError } =
              await supabase
                .from("appointments")
                .select("*")
                .eq("group_id", groupId)
                .eq("status", "confirmed")
                .order("date", { ascending: true })
                .order("time", { ascending: true });

            if (groupError || !groupMembers?.length) {
              console.error("Group reminder lookup failed:", groupError);
              continue;
            }

            const first = groupMembers[0];

            // The earliest appointment controls the entire group reminder.
            const groupTimezone =
              timezoneByBusiness.get(first.business_id) ||
              "America/Santo_Domingo";

            const groupNow = getBusinessLocalDateTime(
              groupTimezone,
              nowUtc
            );

            const [firstHour, firstMinute] = String(first.time || "")
              .split(":")
              .map(Number);

            if (!Number.isFinite(firstHour) ||
                !Number.isFinite(firstMinute)) {
              console.error("Invalid first group appointment time:", groupId);
              continue;
            }

            const todayMs = Date.parse(groupNow.date + "T00:00:00Z");
            const firstDayMs = Date.parse(first.date + "T00:00:00Z");

            const minutesUntilFirst =
              Math.round((firstDayMs - todayMs) / 86400000) * 1440 +
              firstHour * 60 +
              firstMinute -
              (groupNow.hour * 60 + groupNow.minute);

            if (minutesUntilFirst <= 0 || minutesUntilFirst > 120) {
              continue;
            }


            if (processedEmailGroups.has(groupId)) {
              continue;
            }

            processedEmailGroups.add(groupId);

            const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ||
              "https://www.flowpaydr.com").replace(/\/$/, "");

            const appointmentLinks = groupMembers.map((member) => ({
              name: member.customer_name,
              service: member.service,
              date: member.date,
              time: member.time,
              url: baseUrl + "/customer/" +
                encodeURIComponent(member.secret_link || ""),
            }));

            // EMAIL: one combined email to the organizer.
            let emailComplete = groupMembers.every(
              member => member.group_email_reminder_sent === true
            );

            if (!emailComplete) {
              if (!first.customer_email) {
                const { error } = await supabase
                  .from("appointments")
                  .update({ group_email_reminder_sent: true })
                  .eq("group_id", groupId)
                  .eq("status", "confirmed");

                emailComplete = !error;

                if (error) {
                  console.error("Group email tracking failed:", error);
                }
              } else if (!resend) {
                console.error("Group email service unavailable:", groupId);
              } else {
                try {
                  const { data: groupBusiness, error: businessError } =
                    await supabase
                      .from("businesses")
                      .select("name")
                      .eq("id", first.business_id)
                      .maybeSingle();

                  if (businessError) {
                    console.error("Group business lookup failed:", businessError);
                  } else {
                    const spanish =
                      String(first.lang || "es").toUpperCase() === "ES";

                    let groupProfessionalName = "";

                    if (first.provider_id) {
                      const { data: provider } = await supabase
                        .from("providers")
                        .select("name")
                        .eq("id", first.provider_id)
                        .maybeSingle();

                      groupProfessionalName = provider?.name || "";
                    } else if (first.barber_id) {
                      const { data: barber } = await supabase
                        .from("barbers")
                        .select("name")
                        .eq("id", first.barber_id)
                        .maybeSingle();

                      groupProfessionalName = barber?.name || "";
                    }

                    const groupHtml = buildGroupReminderHtml(
                      groupMembers,
                      groupBusiness?.name || "",
                      first.lang,
                      groupProfessionalName
                    );

                    const { error: emailError } = await resend.emails.send({
                      from: "FlowPayDR <info@flowpaydr.com>",
                      to: first.customer_email,
                      subject: spanish
                        ? "Recordatorio de reserva de grupo"
                        : "Group Booking Reminder",
                      html: groupHtml,
                    });

                    if (emailError) {
                      console.error("Group email failed:", emailError);
                    } else {
                      const { error: trackingError } = await supabase
                        .from("appointments")
                        .update({ group_email_reminder_sent: true })
                        .eq("group_id", groupId)
                        .eq("status", "confirmed");

                      emailComplete = !trackingError;

                      if (trackingError) {
                        console.error("Group email tracking failed:", trackingError);
                      } else {
                        console.log("Combined group email sent:", groupId);
                      }
                    }
                  }
                } catch (emailErr) {
                  console.error("Group email exception:", emailErr);
                }
              }
            }

            // PUSH: one combined reminder to the group organizer.
            let pushComplete = groupMembers.every(
              member => member.group_push_reminder_sent === true
            );

            if (!pushComplete) {
              try {
                if (!first.secret_link) {
                  throw new Error("Missing organizer appointment link");
                }

                const { data: tokens, error: tokenError } = await supabase
                  .from("push_tokens")
                  .select("subscription")
                  .eq("user_id", first.secret_link)
                  .eq("role", "customer");

                if (tokenError) {
                  throw tokenError;
                }

                const spanish =
                  String(first.lang || "es").toUpperCase() === "ES";

                const groupSummary = groupMembers.map((item) =>
                  item.customer_name + ": " +
                  item.service + " - " +
                  formatWhatsAppTime(item.time)
                ).join("; ");

                const message = spanish
                  ? "Recordatorio de tu reserva de grupo: " + groupSummary
                  : "Your group booking reminder: " + groupSummary;

                const organizerUrl = baseUrl +
                  "/customer/" + encodeURIComponent(first.secret_link);

                for (const token of tokens || []) {
                  const pushResult = await sendPushToSubscription(token.subscription, {
                    title: spanish
                      ? "Recordatorio de reserva de grupo"
                      : "Group Booking Reminder",
                    message,
                    url: organizerUrl,
                    groupId,
                    appointmentLinks,
                  });

                  if (!pushResult?.success && !pushResult?.expired) {
                    throw new Error("Group push delivery was not confirmed");
                  }
                }

                const { error: pushTrackingError } = await supabase
                  .from("appointments")
                  .update({ group_push_reminder_sent: true })
                  .eq("group_id", groupId)
                  .eq("status", "confirmed");

                if (pushTrackingError) {
                  throw pushTrackingError;
                }

                pushComplete = true;
                console.log("Organizer group push processed:", groupId);
              } catch (pushErr) {
                pushComplete = false;
                console.error("Organizer group push failed:", pushErr);
              }
            }
            // Complete only after the group email and organizer push are processed.
            if (emailComplete && pushComplete) {
              const { error: finalUpdateError } = await supabase
                .from("appointments")
                .update({ reminder_sent: true })
                .eq("group_id", groupId)
                .eq("status", "confirmed");

              if (finalUpdateError) {
                console.error("Group completion update failed:", finalUpdateError);
              } else {
                console.log("Group reminders completed:", groupId);
              }
            } else {
              console.log("Group reminders pending retry:", groupId);
            }

            continue;
          }

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
// PROFESSIONAL EMAIL REMINDER — ES / EN
// ----------------------------------------------

let emailBusinessName = "";

if (appt.business_id) {
  const { data: emailBusiness } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", appt.business_id)
    .maybeSingle();

  emailBusinessName = emailBusiness?.name || "";
}

const customerName =
  appt.customer_name?.trim() ||
  (isSpanish ? "Cliente" : "Customer");

const appointmentDateFormatted = (() => {
  const [year, month, day] = String(appt.date).split("-");
  return `${day}/${month}/${year}`;
})();

const emailMessage = isSpanish
  ? `Hola ${customerName} 👋

📅 Recordatorio de tu cita

Te recordamos que hoy, ${appointmentDateFormatted}, tienes una cita programada.

🏢 Negocio: ${emailBusinessName || "FlowPayDR Booking"}
✂️ Profesional: ${professionalName}
🕘 Hora: ${formattedTime}

¡Te esperamos! 😊

Recordatorio automático de FlowPayDR Booking.`
  : `Hello ${customerName} 👋

📅 Appointment Reminder

This is a reminder that you have an appointment scheduled for today, ${appointmentDateFormatted}.

🏢 Business: ${emailBusinessName || "FlowPayDR Booking"}
✂️ Professional: ${professionalName}
🕘 Time: ${formattedTime}

We look forward to seeing you! 😊

Automated reminder from FlowPayDR Booking.`;


// ----------------------------------------------
// FLOWPAYDR BRANDED HTML EMAIL
// ----------------------------------------------

const escapeEmailHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const emailHtml = `
<!DOCTYPE html>
<html lang="${isSpanish ? "es" : "en"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:24px 12px;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#171717;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"
    style="width:100%;max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:14px;">
    <tr>
      <td align="center" style="background-color:#101010;padding:24px;border-radius:14px 14px 0 0;">
        <img
          src="https://www.flowpaydr.com/FlowPayDR%20Booking%20Gold%20Logo.png"
          alt="FlowPayDR Booking"
          width="190"
          style="display:block;width:190px;max-width:100%;height:auto;border:0;"
        >
      </td>
    </tr>

    <tr>
      <td style="padding:30px 26px;">
        <h1 style="font-size:24px;margin:0 0 20px;color:#171717;">
          ${isSpanish ? "Recordatorio de tu cita" : "Appointment Reminder"}
        </h1>

        <p style="font-size:16px;line-height:1.6;">
          ${isSpanish ? "Hola" : "Hello"} ${escapeEmailHtml(customerName)},
        </p>

        <p style="font-size:15px;line-height:1.7;color:#444444;">
          ${isSpanish
            ? "Te recordamos que tienes una cita programada para hoy."
            : "This is a reminder that you have an appointment scheduled for today."}
        </p>

        <table role="presentation" cellpadding="10" cellspacing="0" border="0"
          style="width:100%;background-color:#f7f7f7;border-radius:8px;font-size:14px;">
          <tr>
            <td><strong>${isSpanish ? "Negocio" : "Business"}</strong></td>
            <td>${escapeEmailHtml(emailBusinessName || "FlowPayDR Booking")}</td>
          </tr>
          <tr>
            <td><strong>${isSpanish ? "Profesional" : "Professional"}</strong></td>
            <td>${escapeEmailHtml(professionalName)}</td>
          </tr>
          <tr>
            <td><strong>${isSpanish ? "Fecha" : "Date"}</strong></td>
            <td>${escapeEmailHtml(appointmentDateFormatted)}</td>
          </tr>
          <tr>
            <td><strong>${isSpanish ? "Hora" : "Time"}</strong></td>
            <td>${escapeEmailHtml(formattedTime)}</td>
          </tr>
        </table>

        <p style="font-size:16px;margin-top:26px;">
          ${isSpanish ? "¡Te esperamos!" : "We look forward to seeing you!"}
        </p>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:18px;background-color:#f7f7f7;border-radius:0 0 14px 14px;font-size:12px;color:#777777;">
        ${isSpanish
          ? "Recordatorio automático de FlowPayDR Booking."
          : "Automated reminder from FlowPayDR Booking."}
      </td>
    </tr>
  </table>
</body>
</html>
`;
let emailSent = false;

if (appt.customer_email && resend) {
  try {
    const { error: emailError } = await resend.emails.send({
      from: "FlowPayDR <info@flowpaydr.com>",
      to: appt.customer_email,
     subject,
     text: emailMessage,
     html: emailHtml,
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
      "❌ Email reminder exception:",
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
          .gte("date", getPreviousCalendarDate(currentDate))
          .lte("date", getNextCalendarDate(getNextCalendarDate(tomorrowDate)))
          .eq("status", "confirmed")
          .eq("whatsapp_reminder_sent", false);

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
          // Group bookings receive one combined email and push reminder.
          if (appt.group_id) continue;
          // ----------------------------------------------
          // BUSINESS / TOUR DETECTION
          // ----------------------------------------------

          let businessName = "";
          let businessCategory = "";
          let businessTimezone = "America/Santo_Domingo";

          if (appt.business_id) {
            const {
              data: business,
              error: businessError,
            } = await supabase
              .from("businesses")
              .select("name, category, timezone")
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
            businessTimezone = business?.timezone || "America/Santo_Domingo";
          }

          // ----------------------------------------------
          // SHOULD SEND NOW?
          // ----------------------------------------------

          const businessNow =
            getBusinessLocalDateTime(businessTimezone);

          const businessTomorrow =
            getNextCalendarDate(businessNow.date);

          const isBusinessReminderWindow =
            businessNow.hour >= 20 &&
            businessNow.hour <= 21;

          const lateTomorrowBooking =
            wasBookedLateForTomorrow(
              appt,
              businessNow.date,
              businessTimezone
            );

          const shouldSendWhatsApp =
            appt.date === businessTomorrow &&
            isBusinessReminderWindow;

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
                formatWhatsAppDate(appt.date),

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
            // ----------------------------------------------
            // BARBER / PROVIDER WHATSAPP REMINDER
            // Spanish and English - 5 variables
            // ----------------------------------------------

            if (!businessName) {
              throw new Error(
                `Appointment ${appt.id} is missing a business name`
              );
            }

            contentSid = isSpanish
              ? WHATSAPP_TEMPLATE_ES
              : WHATSAPP_TEMPLATE_EN;

            variables = {
              // Customer name
              "1":
                appt.customer_name ||
                (isSpanish ? "Cliente" : "Customer"),

              // Appointment date
              "2":
                formatWhatsAppDate(appt.date),

              // Business name
              "3":
                businessName,

              // Professional name
              "4":
                professionalName,

              // Appointment time
              "5":
                formatWhatsAppTime(appt.time),
            };

            console.log(
              "📅 Provider WhatsApp reminder:",
              {
                appointmentId: appt.id,
                businessName,
                professionalName,
                date: tomorrowDate,
                time: appt.time,
                language: isSpanish ? "ES" : "EN",
              }
            );
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