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
    notes
  } = body;

  const customer_id = generateCustomerId();
  const secret_link = crypto.randomUUID();

  const dashboardLink = `https://booking-platform.vercel.app/customer/${customer_id}`;

  // ⭐ FIXED: correct Supabase column names
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

  if (customer_email) {
    await resend.emails.send({
      from: "info@flowpaydr.com",
      to: customer_email,
      subject: "Your Appointment is Confirmed",
      html: `
        <h2>🎉 Appointment Confirmed!</h2>
        <p>Thank you for booking with FlowPayDR.</p>

        <h3>Appointment Details</h3>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Barber:</strong> ${barber}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>

        <h3>Manage Your Appointment</h3>
        <p><a href="${dashboardLink}">${dashboardLink}</a></p>

        <hr>
        <p><strong>FlowPayDR</strong><br>info@flowpaydr.com</p>
      `
    });
  }

  return NextResponse.json({
    success: true,
    dashboardLink,
    appointment: data
  });
}
