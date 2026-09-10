import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ⭐ TRANSLATIONS
const TR = {
  en: {
    subject: "Rate Your Experience",
    title: "⭐ How Was Your Appointment?",
    message: "Please take a moment to rate your experience.",
    button: "Leave a Review",
  },
  es: {
    subject: "Califica tu Experiencia",
    title: "⭐ ¿Cómo estuvo tu cita?",
    message: "Por favor toma un momento para calificar tu experiencia.",
    button: "Dejar Reseña",
  },
};

export async function POST(req) {
  try {
    const body = await req.json();
    const { appointment_id } = body;

    if (!appointment_id) {
      return NextResponse.json(
        { error: "Missing appointment_id" },
        { status: 400 }
      );
    }

    // ⭐ Fetch appointment info
    const { data: appt, error } = await supabase
      .from("appointments")
      .select(
        "id, customer_email, customer_name, barber_id, business_id, date, time, lang, status, rating_sent"
      )
      .eq("id", appointment_id)
      .single();

    if (error || !appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // ⭐ Only send review email for completed appointments
    if (appt.status !== "completed") {
      return NextResponse.json(
        {
          success: false,
          error: "Appointment is not completed",
        },
        { status: 400 }
      );
    }

    // ⭐ Prevent duplicate rating emails
    if (appt.rating_sent) {
      return NextResponse.json({
        success: true,
        already_sent: true,
      });
    }

    // ⭐ Customer email required
    if (!appt.customer_email) {
      return NextResponse.json(
        { error: "Customer email is missing" },
        { status: 400 }
      );
    }

    // ⭐ Determine language
    const langCode = appt.lang === "es" ? "es" : "en";
    const tr = TR[langCode];

    // ⭐ Build rating link WITH LANGUAGE
    const ratingLink = `https://flowpaydr.com/rate/${appointment_id}?lang=${langCode}`;

    // ⭐ Send rating email
    const { error: emailError } = await resend.emails.send({
      from: "info@flowpaydr.com",
      to: appt.customer_email,
      subject: tr.subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 550px; margin: auto; border-radius: 12px; background: #ffffff; border: 1px solid #eee;">
          
          <h2 style="text-align:center;">${tr.title}</h2>
          <p style="text-align:center;">${tr.message}</p>

          <div style="text-align:center; margin-top: 25px;">
            <a
              href="${ratingLink}"
              style="background:#2563eb; color:white; padding:12px 20px; border-radius:8px; text-decoration:none; font-size:16px;"
            >
              ${tr.button}
            </a>
          </div>

          <p style="margin-top:30px; font-size:12px; text-align:center; color:#666;">
            FlowPayDR • info@flowpaydr.com
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Rating email send error:", emailError);

      return NextResponse.json(
        { error: "Failed to send rating email" },
        { status: 500 }
      );
    }

    // ⭐ Mark rating_sent = true
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ rating_sent: true })
      .eq("id", appointment_id);

    if (updateError) {
      console.error("Rating sent update error:", updateError);

      return NextResponse.json(
        {
          error: "Email sent but failed to update rating_sent",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rating_sent: true,
    });
  } catch (err) {
    console.error("Rating email error:", err);

    return NextResponse.json(
      { error: "Failed to send rating email" },
      { status: 500 }
    );
  }
}