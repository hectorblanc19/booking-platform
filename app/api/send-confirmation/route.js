import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ⭐ SERVICE TRANSLATIONS
const SERVICE_TRANSLATIONS = {
  "Haircut": { en: "Haircut", es: "Corte" },
  "Beard": { en: "Beard", es: "Barba" },
  "Haircut + Beard": { en: "Haircut + Beard", es: "Corte + Barba" },
  "Fade": { en: "Fade", es: "Degradado" },
  "Other": { en: "Other", es: "Otro" }
};

export async function POST(req) {
  const body = await req.json();

  const {
    customer_email,
    customer_name,
    service,
    barber_id,
    business_id,
    date,
    time,
    secret_link,
    lang = "en",
  } = body;

  if (!customer_email) {
    return NextResponse.json({ error: "Missing email" });
  }

  // ⭐ Determine language
  const langCode = lang === "es" ? "es" : "en";

  // ⭐ Translate service
  const translatedService =
    SERVICE_TRANSLATIONS[service]?.[langCode] || service;

  // ⭐ TRANSLATIONS FOR THE REST OF THE EMAIL
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
      manage: "Gestiona tu Cita",
      button: "Ver Cita",
      maps: "Abrir en Google Maps",
    },
  }[langCode];

  // ⭐ FETCH BUSINESS INFO
  const { data: businessInfo } = await supabase
    .from("businesses")
    .select("name, address, phone")
    .eq("id", business_id)
    .single();

  // ⭐ FETCH BARBER INFO
  const { data: barberInfo } = await supabase
    .from("barbers")
    .select("name")
    .eq("id", barber_id)
    .single();

  // ⭐ Auto-generate Google Maps link
  const mapsLink = businessInfo?.address
    ? `https://maps.google.com/?q=${encodeURIComponent(businessInfo.address)}`
    : null;

  try {
    await resend.emails.send({
      from: "info@flowpaydr.com",
      to: customer_email,
      subject: tr.subject,
      html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 550px; margin: auto; border-radius: 12px; background: #ffffff; border: 1px solid #eee;">
        
        <h2 style="text-align:center;">${tr.title}</h2>
        <p style="text-align:center;">${tr.thanks} <strong>${businessInfo?.name}</strong></p>

        <h3>${tr.details}</h3>
        <p><strong>${tr.service}:</strong> ${translatedService}</p>
        <p><strong>${tr.barber}:</strong> ${barberInfo?.name}</p>
        <p><strong>${tr.business}:</strong> ${businessInfo?.name}</p>
        <p><strong>${tr.address}:</strong> ${businessInfo?.address || "N/A"}</p>
        <p><strong>${tr.phone}:</strong> ${businessInfo?.phone || "N/A"}</p>
        <p><strong>${tr.date}:</strong> ${date}</p>
        <p><strong>${tr.time}:</strong> ${time}</p>

        ${
          mapsLink
            ? `<div style="text-align:center; margin-top: 15px;">
                <a href="${mapsLink}" 
                  style="background:#10b981; color:white; padding:10px 18px; border-radius:8px; text-decoration:none; font-size:15px;">
                  ${tr.maps}
                </a>
              </div>`
            : ""
        }

        <div style="text-align:center; margin-top: 25px;">
          <a href="${secret_link}" 
            style="background:#2563eb; color:white; padding:12px 20px; border-radius:8px; text-decoration:none; font-size:16px;">
            ${tr.button}
          </a>
        </div>

        <p style="margin-top:30px; font-size:12px; text-align:center; color:#666;">
          FlowPayDR • info@flowpaydr.com
        </p>
      </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json({ error: "Failed to send email" });
  }
}
