import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ⭐ Normalize time to HH:MM:SS
function normalize(t) {
  if (!t) return t;
  return t.length === 5 ? t + ":00" : t; // "19:00" → "19:00:00"
}

export async function GET() {
  console.log("🚀 Email + Push Reminder job started");

  const now = new Date();
  const currentDate = now.toISOString().split("T")[0];

  // Current time normalized
  const currentTime = normalize(now.toTimeString().slice(0, 5));

  // 2-hour window normalized
  const twoHours = new Date(now.getTime() + 120 * 60000);
  const twoHoursTime = normalize(twoHours.toTimeString().slice(0, 5));

  console.log("⏱ Window:", currentTime, "→", twoHoursTime);

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("date", currentDate)
    .eq("status", "confirmed")
    .gte("time", currentTime)
    .lte("time", twoHoursTime)
    .is("reminder_sent", null);

  if (error) {
    console.error("❌ Supabase error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!appointments || appointments.length === 0) {
    console.log("ℹ️ No reminders to send");
    return NextResponse.json({ message: "No reminders to send" });
  }

  console.log("📌 Appointments found:", appointments.length);

  for (const appt of appointments) {
    try {
      const apptTime = normalize(appt.time);

      // Bilingual message
      const msgEN = `Reminder: You have an appointment today at ${apptTime}.`;
      const msgES = `Recordatorio: Tienes una cita hoy a las ${apptTime}.`;

      const finalMessage = `${msgEN}\n\n${msgES}`;

      // UNIQUE SUBJECT (Outlook fix)
      const subject = `Appointment Reminder (${apptTime}) / Recordatorio de Cita (${apptTime})`;

      // ⭐ EMAIL REMINDER
      await resend.emails.send({
        from: "FlowPayDR <reminders@flowpay.app>",
        to: appt.customer_email,
        subject,
        text: finalMessage,
      });

      console.log("📧 Email reminder sent to:", appt.customer_email);

      // ⭐ PUSH NOTIFICATION REMINDER
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/push/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: appt.secret_link,   // customer identifier
            role: "customer",
            title: "Appointment Reminder",
            message: `Your appointment is today at ${apptTime}.`,
          }),
        });

        console.log("📲 Push reminder sent to:", appt.customer_email);
      } catch (pushErr) {
        console.error("❌ Push Reminder Error:", pushErr);
      }

      // ⭐ MARK REMINDER AS SENT
      await supabase
        .from("appointments")
        .update({ reminder_sent: true })
        .eq("id", appt.id);

    } catch (err) {
      console.error("❌ Email Reminder Error:", err);
    }
  }

  return NextResponse.json({
    success: true,
    message: "Email + Push reminders processed",
    count: appointments.length,
  });
}
