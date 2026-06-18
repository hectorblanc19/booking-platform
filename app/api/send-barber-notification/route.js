import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    dashboard_link
  } = body;

  if (!barber_email) {
    return NextResponse.json({ error: "Missing barber email" });
  }

  try {
    await resend.emails.send({
      from: "info@flowpaydr.com",
      to: barber_email,
      subject: "New Appointment Booked",
      html: `
        <h2>💈 New Appointment</h2>
        <p>You have a new appointment booked.</p>

        <h3>Customer Details</h3>
        <p><strong>Name:</strong> ${customer_name}</p>
        <p><strong>Phone:</strong> ${customer_phone}</p>
        <p><strong>Email:</strong> ${customer_email}</p>

        <h3>Appointment Details</h3>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Notes:</strong> ${notes || "None"}</p>

        <h3>Manage Appointments</h3>
        <p><a href="${dashboard_link}">${dashboard_link}</a></p>

        <hr>
        <p><strong>FlowPayDR</strong><br>info@flowpaydr.com</p>
      `
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Barber email error:", err);
    return NextResponse.json({ error: "Failed to send barber email" });
  }
}
