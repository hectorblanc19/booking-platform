import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { sendPushToSubscription } from "@/lib/push";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

export async function POST(req) {
  const body = await req.json();

  const {
    customer_email,
    customer_name,
    service,
    barber_id,
    provider_id,
    business_id,
    date,
    time,
    secret_link,
    lang = "en",
    customer_id,

    // ⭐ TOUR FIELDS
    guest_count,
    pickup_location,
    is_group_booking,
  } = body;

  if (!customer_email) {
    return NextResponse.json({
      error: "Missing email",
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
      subject: "Your Appointment is Confirmed",

      title: "🎉 Appointment Confirmed!",

      thanks: "Thank you for booking with",

      details: "Appointment Details",

      service: "Service",

      barber: "Barber",

      business: "Business",

      address: "Address",

      phone: "Phone",

      date: "Date",

      time: "Time",

      guests: "Guests",

      pickup: "Meeting / Pickup Location",

      manage: "Manage Your Appointment",

      button: "View Appointment",

      maps: "Open in Google Maps",
    },

    es: {
      subject: "Tu Cita ha sido Confirmada",

      title: "🎉 ¡Cita Confirmada!",

      thanks: "Gracias por reservar con",

      details: "Detalles de la Cita",

      service: "Servicio",

      barber: "Barbero",

      business: "Negocio",

      address: "Dirección",

      phone: "Teléfono",

      date: "Fecha",

      time: "Hora",

      guests: "Personas",

      pickup: "Punto de encuentro o recogida",

      manage: "Gestiona tu Cita",

      button: "Ver Cita",

      maps: "Abrir en Google Maps",
    },
  }[langCode];

  // ⭐ FETCH BUSINESS INFO
  let businessInfo = null;

  if (business_id) {
    const {
      data,
      error,
    } = await supabase
      .from("businesses")
      .select(
        "name, address, phone, category"
      )
      .eq("id", business_id)
      .single();

    if (error) {
      console.error(
        "Business lookup error:",
        error
      );
    }

    businessInfo = data;
  }

  // ⭐ DETECT TOUR BUSINESS
  const normalizedCategory =
    businessInfo?.category
      ?.trim()
      .toLowerCase() || "";

  const isTourBusiness =
    normalizedCategory.includes("tour") ||
    normalizedCategory.includes(
      "excursion"
    ) ||
    normalizedCategory.includes(
      "excursión"
    );

  // ⭐ FETCH BARBER OR PROVIDER INFO
  let professionalInfo = null;

  let professionalType = "barber";

  if (provider_id) {
    const {
      data,
      error,
    } = await supabase
      .from("providers")
      .select(
        "name, phone, specialty"
      )
      .eq("id", provider_id)
      .single();

    if (error) {
      console.error(
        "Provider lookup error:",
        error
      );
    }

    professionalInfo = data;

    professionalType = "provider";
  } else if (barber_id) {
    const {
      data,
      error,
    } = await supabase
      .from("barbers")
      .select(
        "name, address, phone"
      )
      .eq("id", barber_id)
      .single();

    if (error) {
      console.error(
        "Barber lookup error:",
        error
      );
    }

    professionalInfo = data;
  }

  // ⭐ FINAL BUSINESS / PROFESSIONAL VALUES
  const finalBusinessName =
    businessInfo?.name ||
    professionalInfo?.name ||
    "FlowPayDR";

  const finalBusinessLabel =
    businessInfo?.name ||
    (
      professionalType === "barber"
        ? "Independent Barber"
        : professionalInfo?.name ||
          "Professional"
    );

  const finalAddress =
    businessInfo?.address ||
    professionalInfo?.address ||
    "N/A";

  const finalPhone =
    businessInfo?.phone ||
    professionalInfo?.phone ||
    "N/A";

  // ⭐ GOOGLE MAPS LINK
  const mapsLink =
    finalAddress !== "N/A"
      ? `https://maps.google.com/?q=${encodeURIComponent(
          finalAddress
        )}`
      : null;

  // ⭐ TOUR-SPECIFIC EMAIL BLOCK
  const tourDetailsHtml =
    isTourBusiness &&
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
              guest_count !==
                null &&
              guest_count !==
                undefined &&
              guest_count !== ""
                ? guest_count
                : "N/A"
            }
          </p>

          <p style="margin: 5px 0;">
            <strong>${tr.pickup}:</strong>
            ${
              pickup_location ||
              "N/A"
            }
          </p>
        </div>
      `
      : "";

  // ⭐ SEND EMAIL
  try {
    const {
      data: emailData,
      error: emailError,
    } = await resend.emails.send({
      from:
        "FlowPayDR <info@flowpaydr.com>",

      to: customer_email,

      subject: tr.subject,

      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 550px;
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
            ${tr.thanks}
            <strong>
              ${finalBusinessName}
            </strong>
          </p>

          <h3>
            ${tr.details}
          </h3>

          <p>
            <strong>
              ${tr.service}:
            </strong>

            ${translatedService}
          </p>

          <p>
            <strong>
              ${
                professionalType ===
                "barber"
                  ? tr.barber
                  : langCode === "es"
                  ? "Profesional"
                  : "Professional"
              }:
            </strong>

            ${
              professionalInfo?.name ||
              "N/A"
            }
          </p>

          <p>
            <strong>
              ${tr.business}:
            </strong>

            ${finalBusinessLabel}
          </p>

          <p>
            <strong>
              ${tr.address}:
            </strong>

            ${finalAddress}
          </p>

          <p>
            <strong>
              ${tr.phone}:
            </strong>

            ${finalPhone}
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

          ${
            mapsLink
              ? `
                <div
                  style="
                    text-align:center;
                    margin-top: 20px;
                  "
                >
                  <a
                    href="${mapsLink}"
                    style="
                      background:#10b981;
                      color:white;
                      padding:10px 18px;
                      border-radius:8px;
                      text-decoration:none;
                      font-size:15px;
                      display:inline-block;
                    "
                  >
                    ${tr.maps}
                  </a>
                </div>
              `
              : ""
          }

          <div
            style="
              text-align:center;
              margin-top:25px;
            "
          >
            <a
              href="${secret_link}"
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
        "Email send error:",
        emailError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to send email",
        },
        {
          status: 500,
        }
      );
    }

    console.log(
      "📧 Customer confirmation email sent to:",
      customer_email
    );
  } catch (err) {
    console.error(
      "Email error:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to send email",
      },
      {
        status: 500,
      }
    );
  }

  // ⭐ SEND PUSH NOTIFICATION TO CUSTOMER
  try {
    const {
      data: tokens,
      error: tokenError,
    } = await supabase
      .from("push_tokens")
      .select("subscription")
      .eq(
        "user_id",
        secret_link
      )
      .eq(
        "role",
        "customer"
      );

    if (tokenError) {
      console.error(
        "Push token lookup error:",
        tokenError
      );
    }

    if (
      !tokens ||
      tokens.length === 0
    ) {
      console.log(
        "ℹ️ No push tokens for customer:",
        secret_link
      );
    }

    for (
      const token of
      tokens || []
    ) {
      await sendPushToSubscription(
        token.subscription,
        {
          title: "FlowPayDR",

          message:
            langCode === "es"
              ? `Tu cita está confirmada para ${date} a las ${formatTime(
                  time
                )}.`
              : `Your appointment is confirmed for ${date} at ${formatTime(
                  time
                )}.`,
        }
      );
    }

    console.log(
      "📲 Customer push notifications sent:",
      tokens?.length || 0
    );
  } catch (err) {
    console.error(
      "❌ Customer push error:",
      err
    );
  }

  return NextResponse.json({
    success: true,
  });
}