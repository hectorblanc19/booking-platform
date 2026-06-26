import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Convert server time to Dominican Republic time
function getDRTime() {
  const now = new Date();
  const drString = now.toLocaleString("en-US", { timeZone: "America/Santo_Domingo" });
  return new Date(drString);
}

export async function GET() {
  console.log("🚀 Email + Push Reminder job started (DR Time)");

  // Use Dominican Republic time
  const now = getDRTime();

  const currentDate = now.toISOString().split("T")[0];

  // FIXED: Always use HH:MM:SS for PostgreSQL TIME type
  const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

  const twoHours = new Date(now.getTime() + 120 * 60000);
  const twoHoursTime = twoHours.toTimeString().slice(0, 8); // HH:MM:SS

  console.log("⏱ DR Window:", currentTime, "→", twoHoursTime);

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
      const apptTime = appt.time; // Already HH:MM:SS from DB

      // Fetch barber name
      const { data: barber } = await supabase
        .from("barbers")
        .select("name")
        .eq("id", appt.barber_id)
        .single();

      const barberName = barber?.name || "your barber";

      // Determine language
      const isSpanish = appt.lang?.toUpperCase() === "ES";

      // Build bilingual message with icons
      const msgEN = `
🗓️ Appointment Reminder  
You have an appointment today at ${apptTime} with barber ${barberName}.  
💈 Please arrive 5 minutes early.
`;

      const msgES = `
🗓️ Recordatorio de Cita  
Tienes una cita hoy a las ${apptTime} con el barbero ${barberName}.  
💈 Por favor llega 5 minutos antes.
`;

      const finalMessage = isSpanish ? msgES : msgEN;

      const subject = isSpanish
        ? `Recordatorio de Cita (${apptTime})`
        : `Appointment Reminder (${apptTime})`;

      // EMAIL REMINDER
      await resend.emails.send({
        from: "FlowPayDR <info@flowpaydr.com>",
        to: appt.customer_email,
        subject,
        text: finalMessage,
      });

      console.log("📧 Email reminder sent to:", appt.customer_email);

      // PUSH NOTIFICATION REMINDER
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

      if (!baseUrl) {
        console.error("❌ Missing NEXT_PUBLIC_BASE_URL");
      } else {
        try {
          await fetch(`${baseUrl}/api/push/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: appt.secret_link,
              role: "customer",
              title: isSpanish ? "Recordatorio de Cita" : "Appointment Reminder",
              message: isSpanish
                ? `Tienes una cita hoy a las ${apptTime} con el barbero ${barberName}.`
                : `You have an appointment today at ${apptTime} with barber ${barberName}.`,
            }),
          });

          console.log("📲 Push reminder sent to:", appt.customer_email);
        } catch (pushErr) {
          console.error("❌ Push Reminder Error:", pushErr);
        }
      }

      // MARK REMINDER AS SENT
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

// ⭐ REQUIRED FOR CRON-JOB.ORG (POST SUPPORT)
export async function POST(req) {
  return GET();
}
