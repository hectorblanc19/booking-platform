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
    barber_email,
    barber_name,
    customer_name,
    customer_phone,
    customer_email,
    service,
    date,
    time,
    notes,
    dashboard_link,
    lang = "en",
  } = body;

  if (!barber_email) {
    return NextResponse.json({ error: "Missing barber email" });
  }

  // ⭐ Determine language
  const langCode = lang === "es" ? "es" : "en";

  // ⭐ Translate service
  const translatedService =
    SERVICE_TRANSLATIONS[service]?.[langCode] || service;

  // ⭐ TRANSLATIONS FOR THE REST OF THE EMAIL
  const tr = {
    en: {
      subject: "New Appointment Booked",
      title: "💈 New Appointment",
      intro: "You have a new appointment.",
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
      manage: "Manage Appointments",
      button: "Open Dashboard",
    },
    es: {
      subject: "Nueva Cita Reservada",
      title: "💈 Nueva Cita",
      intro: "Tienes una nueva cita.",
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
      manage: "Gestionar Citas",
      button: "Abrir Panel",
    },
  }[langCode];

  try {
    await resend.emails.send({
      from: "info@flowpaydr.com",
      to: barber_email,
      subject: tr.subject,
      html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 500px; margin: auto; border-radius: 12px; background: #ffffff; border: 1px solid #eee;">
        
        <h2 style="text-align:center;">${tr.title}</h2>
        <p style="text-align:center;">${tr.intro}</p>

        <h3>${tr.customerDetails}</h3>
        <p><strong>${tr.name}:</strong> ${customer_name}</p>
        <p><strong>${tr.phone}:</strong> ${customer_phone}</p>
        <p><strong>${tr.email}:</strong> ${customer_email}</p>

        <h3>${tr.apptDetails}</h3>
        <p><strong>${tr.service}:</strong> ${translatedService}</p>
        <p><strong>${tr.date}:</strong> ${date}</p>
        <p><strong>${tr.time}:</strong> ${time}</p>
        <p><strong>${tr.notes}:</strong> ${notes || tr.none}</p>

        <div style="text-align:center; margin-top: 25px;">
          <a href="${dashboard_link}" 
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
    console.error("Barber email error:", err);
    return NextResponse.json({ error: "Failed to send barber email" });
  }
}
