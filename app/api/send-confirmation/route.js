import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    barber_name,
    business_name,
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
      date: "Date",
      time: "Time",
      manage: "Manage Your Appointment",
      button: "View Appointment",
    },
    es: {
      subject: "Tu Cita ha sido Confirmada",
      title: "🎉 ¡Cita Confirmada!",
      thanks: "Gracias por reservar con",
      details: "Detalles de la Cita",
      service: "Servicio",
      barber: "Barbero",
      business: "Negocio",
      date: "Fecha",
      time: "Hora",
      manage: "Gestiona tu Cita",
      button: "Ver Cita",
    },
  }[langCode];

  try {
    await resend.emails.send({
      from: "info@flowpaydr.com",
      to: customer_email,
      subject: tr.subject,
      html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto; border-radius: 12px; background: #ffffff; border: 1px solid #eee;">
        
        <h2 style="text-align:center;">${tr.title}</h2>
        <p style="text-align:center;">${tr.thanks} <strong>${business_name}</strong></p>

        <h3>${tr.details}</h3>
        <p><strong>${tr.service}:</strong> ${translatedService}</p>
        <p><strong>${tr.barber}:</strong> ${barber_name}</p>
        <p><strong>${tr.business}:</strong> ${business_name}</p>
        <p><strong>${tr.date}:</strong> ${date}</p>
        <p><strong>${tr.time}:</strong> ${time}</p>

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
