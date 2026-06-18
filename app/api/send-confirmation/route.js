import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    secret_link
  } = body;

  if (!customer_email) {
    return NextResponse.json({ error: "Missing email" });
  }

  try {
    await resend.emails.send({
      from: "info@flowpaydr.com",
      to: customer_email,
      subject: "Your Appointment is Confirmed",
      html: `
        <h2>🎉 Appointment Confirmed!</h2>
        <p>Thank you for booking with FlowPayDR.</p>

        <h3>Appointment Details</h3>
        <p><strong>Service:</strong> ${service}</p>
        <p><strong>Barber:</strong> ${barber_name}</p>
        <p><strong>Business:</strong> ${business_name}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>

        <h3>Manage Your Appointment</h3>
        <p><a href="${secret_link}">${secret_link}</a></p>

        <hr>
        <p><strong>FlowPayDR</strong><br>info@flowpaydr.com</p>
      `
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    return NextResponse.json({ error: "Failed to send email" });
  }
}
