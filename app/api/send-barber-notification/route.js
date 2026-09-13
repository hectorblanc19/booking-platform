import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { sendPushToSubscription } from "@/lib/push";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ⭐ FORMAT TIME FOR DISPLAY
function formatTime(timeStr) {
  if (!timeStr) return "";

  const [hoursString, minutes] = timeStr.split(":");
  let hours = Number(hoursString);

  if (Number.isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${ampm}`;
}

// ⭐ SERVICE TRANSLATIONS
const SERVICE_TRANSLATIONS = {
  Haircut: { en: "Haircut", es: "Corte" },

  Beard: { en: "Beard", es: "Barba" },

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

export async function POST(req) {
  const body = await req.json();

  const {
    barber_email,
    barber_name,
    barber_id,

    // ⭐ GENERIC PROVIDER SUPPORT
    provider_email,
    provider_name,
    provider_id,

    customer_name,
    customer_phone,
    customer_email,

    service,
    date,
    time,
    notes,

    dashboard_link,
    lang = "en",

    // ⭐ EMAIL TYPE
    notification_type = "new",

    // ⭐ TOUR / GROUP BOOKING FIELDS
    guest_count,
    pickup_location,
    is_group_booking = false,
  } = body;

  // ⭐ DETERMINE IF THIS IS A PROVIDER OR BARBER
  const isProvider = Boolean(provider_id);

  // ⭐ NOTIFICATION TYPE
  const isReschedule =
    notification_type === "reschedule";

  const isCancellation =
    notification_type === "cancelled";

  // ⭐ FINAL PROFESSIONAL INFORMATION
  const professionalEmail = isProvider
    ? provider_email
    : barber_email;

  const professionalName = isProvider
    ? provider_name
    : barber_name;

  const professionalId = isProvider
    ? provider_id
    : barber_id;

  if (!professionalEmail) {
    return NextResponse.json({
      error: isProvider
        ? "Missing provider email"
        : "Missing barber email",
    });
  }

  // ⭐ DETERMINE LANGUAGE
  const langCode =
    lang === "es"
      ? "es"
      : "en";

  // ⭐ TRANSLATE SERVICE
  const translatedService =
    SERVICE_TRANSLATIONS[service]?.[langCode] ||
    service;

  // ⭐ EMAIL TRANSLATIONS
  const tr = {
    en: {
      subject: isCancellation
        ? "Appointment Cancelled"
        : isReschedule
        ? "Appointment Rescheduled"
        : "New Appointment Booked",

      title: isCancellation
        ? "❌ Appointment Cancelled"
        : isReschedule
        ? "🔄 Appointment Rescheduled"
        : isProvider
        ? "📅 New Appointment"
        : "💈 New Appointment",

      intro: isCancellation
        ? "A customer has cancelled their appointment."
        : isReschedule
        ? "A customer has rescheduled their appointment."
        : "You have a new appointment.",

      customerDetails: "Customer Details",

      name: "Name",

      phone: "Phone",

      email: "Email",

      apptDetails: "Appointment Details",

      service: "Service",

      date: "Date",

      time: "Time",

      notes: "Notes",

      none: "None",

      guests: "Guests",

      pickup: "Meeting / Pickup Location",

      professional: isProvider
        ? "Professional"
        : "Barber",

      button: "Open Dashboard",
    },

    es: {
      subject: isCancellation
        ? "Cita Cancelada"
        : isReschedule
        ? "Cita Reprogramada"
        : "Nueva Cita Reservada",

      title: isCancellation
        ? "❌ Cita Cancelada"
        : isReschedule
        ? "🔄 Cita Reprogramada"
        : isProvider
        ? "📅 Nueva Cita"
        : "💈 Nueva Cita",

      intro: isCancellation
        ? "Un cliente ha cancelado su cita."
        : isReschedule
        ? "Un cliente ha reprogramado su cita."
        : "Tienes una nueva cita.",

      customerDetails: "Detalles del Cliente",

      name: "Nombre",

      phone: "Teléfono",

      email: "Correo",

      apptDetails: "Detalles de la Cita",

      service: "Servicio",

      date: "Fecha",

      time: "Hora",

      notes: "Notas",

      none: "Ninguna",

      guests: "Personas",

      pickup: "Punto de encuentro o recogida",

      professional: isProvider
        ? "Profesional"
        : "Barbero",

      button: "Abrir Panel",
    },
  }[langCode];

  // ⭐ TOUR DETAILS
  // These only appear for Tour / group reservations.
  const tourDetailsHtml =
    is_group_booking
      ? `
        <div
          style="
            margin-top: 15px;
            padding: 14px;
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-radius: 10px;
          "
        >
          <p style="margin: 5px 0;">
            <strong>${tr.guests}:</strong>
            ${
              guest_count !== null &&
              guest_count !== undefined &&
              guest_count !== ""
                ? guest_count
                : "N/A"
            }
          </p>

          <p style="margin: 5px 0;">
            <strong>${tr.pickup}:</strong>
            ${pickup_location || "N/A"}
          </p>
        </div>
      `
      : "";

  // ⭐ SEND EMAIL TO BARBER OR PROVIDER
  try {
    const {
      data: emailData,
      error: emailError,
    } = await resend.emails.send({
      from: "FlowPayDR <info@flowpaydr.com>",

      to: professionalEmail,

      subject: tr.subject,

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 500px;
            margin: auto;
            border-radius: 12px;
            background: #ffffff;
            border: 1px solid #eeeeee;
          "
        >

          <h2 style="text-align:center;">
            ${tr.title}
          </h2>

          <p style="text-align:center;">
            ${tr.intro}
          </p>

          <p style="text-align:center;">
            <strong>
              ${tr.professional}:
            </strong>

            ${professionalName || "N/A"}
          </p>

          <h3>
            ${tr.customerDetails}
          </h3>

          <p>
            <strong>
              ${tr.name}:
            </strong>

            ${customer_name || "N/A"}
          </p>

          <p>
            <strong>
              ${tr.phone}:
            </strong>

            ${customer_phone || "N/A"}
          </p>

          <p>
            <strong>
              ${tr.email}:
            </strong>

            ${customer_email || "N/A"}
          </p>

          <h3>
            ${tr.apptDetails}
          </h3>

          <p>
            <strong>
              ${tr.service}:
            </strong>

            ${translatedService}
          </p>

          <p>
            <strong>
              ${tr.date}:
            </strong>

            ${date}
          </p>

          <p>
            <strong>
              ${tr.time}:
            </strong>

            ${formatTime(time)}
          </p>

          ${tourDetailsHtml}

          <p>
            <strong>
              ${tr.notes}:
            </strong>

            ${notes || tr.none}
          </p>

          ${
            dashboard_link
              ? `
                <div
                  style="
                    text-align:center;
                    margin-top:25px;
                  "
                >
                  <a
                    href="${dashboard_link}"
                    style="
                      background:#2563eb;
                      color:white;
                      padding:12px 20px;
                      border-radius:8px;
                      text-decoration:none;
                      font-size:16px;
                      display:inline-block;
                    "
                  >
                    ${tr.button}
                  </a>
                </div>
              `
              : ""
          }

          <p
            style="
              margin-top:30px;
              font-size:12px;
              text-align:center;
              color:#666666;
            "
          >
            FlowPayDR • info@flowpaydr.com
          </p>

        </div>
      `,
    });

    if (emailError) {
      console.error(
        `${
          isProvider
            ? "Provider"
            : "Barber"
        } email send error:`,
        emailError
      );

      return NextResponse.json(
        {
          success: false,
          error: `Failed to send ${
            isProvider
              ? "provider"
              : "barber"
          } email`,
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      `📧 ${
        isProvider
          ? "Provider"
          : "Barber"
      } ${
        isCancellation
          ? "cancellation"
          : isReschedule
          ? "reschedule"
          : "appointment"
      } email sent to:`,
      professionalEmail
    );
  } catch (err) {
    console.error(
      `${
        isProvider
          ? "Provider"
          : "Barber"
      } email error:`,
      err
    );

    return NextResponse.json(
      {
        success: false,
        error: `Failed to send ${
          isProvider
            ? "provider"
            : "barber"
        } email`,
      },
      {
        status: 500,
      }
    );
  }

  // ⭐ KEEP EXISTING BARBER PUSH NOTIFICATION
  // Generic providers do not use barber push-token logic.
  if (
    !isProvider &&
    professionalId
  ) {
    try {
      const {
        data: tokens,
        error: tokenError,
      } = await supabase
        .from("push_tokens")
        .select("subscription")
        .eq(
          "user_id",
          professionalId
        )
        .eq(
          "role",
          "barber"
        );

      if (tokenError) {
        console.error(
          "Barber push-token lookup error:",
          tokenError
        );
      }

      if (
        !tokens ||
        tokens.length === 0
      ) {
        console.log(
          "ℹ️ No push tokens for barber:",
          professionalId
        );
      }

      for (
        const token of tokens || []
      ) {
        await sendPushToSubscription(
          token.subscription,
          {
            title: isCancellation
              ? "Appointment Cancelled"
              : isReschedule
              ? "Appointment Rescheduled"
              : "New Appointment",

            message: isCancellation
              ? `${customer_name} cancelled their appointment for ${date} at ${formatTime(
                  time
                )}.`
              : isReschedule
              ? `${customer_name} moved their appointment to ${date} at ${formatTime(
                  time
                )}.`
              : `${customer_name} booked for ${date} at ${formatTime(
                  time
                )}.`,
          }
        );
      }

      console.log(
        "📲 Barber push notifications sent:",
        tokens?.length || 0
      );
    } catch (err) {
      console.error(
        "❌ Barber push error:",
        err
      );
    }
  }

  return NextResponse.json({
    success: true,
  });
}