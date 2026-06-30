import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

function generateCustomerId() {
  return Math.random().toString(36).substring(2, 10);
}

export async function POST(req) {
  const body = await req.json();

  const {
    business,
    barber,
    service,
    date,
    time,
    customer_name,
    customer_email,
    customer_phone,
    notes,
    lang // ⭐ IMPORTANT: language from booking page
  } = body;

  const customer_id = generateCustomerId();
  const secret_link = crypto.randomUUID();

  const dashboardLink = `https://booking-platform.vercel.app/customer/${customer_id}`;

  // ⭐ CHECK AVAILABILITY
  const { data: existing } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", date)
    .eq("time", time)
    .eq("barber_id", barber)
    .eq("status", "confirmed")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Time slot already taken" });
  }

  // ⭐ LOOKUP BUSINESS INFO
  const { data: businessInfo } = await supabase
    .from("businesses")
    .select("name, address, phone")
    .eq("id", business)
    .single();

  // ⭐ LOOKUP BARBER NAME
  const { data: barberInfo } = await supabase
    .from("barbers")
    .select("name")
    .eq("id", barber)
    .single();

  const barberName = barberInfo?.name || "Your Barber";

  // ⭐ INSERT APPOINTMENT
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      business_id: business,
      barber_id: barber,
      service,
      date,
      time,
      duration: 60,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      customer_id,
      status: "confirmed",
      secret_link
    })
    .select()
    .single();

  if (error) {
    console.log("Supabase error:", error);
    return NextResponse.json({ error: "Failed to create appointment" });
  }

  // ⭐ SEND EMAIL (BILINGUAL)
  if (customer_email) {
    const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(
      businessInfo.address
    )}`;

    const emailEN = `
Your appointment is confirmed!

Barber: ${barberName}
Business: ${businessInfo.name}
Address: ${businessInfo.address}
Google Maps: ${mapsLink}
Phone: ${businessInfo.phone}

Service: ${service}
Date: ${date}
Time: ${time}

Please arrive 5–10 minutes early.

Manage your appointment:
${dashboardLink}
`;

    const emailES = `
¡Tu cita está confirmada!

Barbero: ${barberName}
Negocio: ${businessInfo.name}
Dirección: ${businessInfo.address}
Google Maps: ${mapsLink}
Teléfono: ${businessInfo.phone}

Servicio: ${service}
Fecha: ${date}
Hora: ${time}

Por favor llega 5–10 minutos antes.

Gestiona tu cita:
${dashboardLink}
`;

    const emailToSend = lang === "es" ? emailES : emailEN;

    await resend.emails.send({
      from: "info@flowpaydr.com",
      to: customer_email,
      subject: lang === "es" ? "Tu cita está confirmada" : "Your Appointment is Confirmed",
      html: emailToSend.replace(/\n/g, "<br>")
    });
  }

  return NextResponse.json({
    success: true,
    dashboardLink,
    appointment: data
  });
}
