import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { sendPushToSubscription } from "@/lib/push";

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
  console.log("🚀 Reminder job started (DR Time)");

  const now = getDRTime();
  const currentDate = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().slice(0, 8);

  const twoHours = new Date(now.getTime() + 120 * 60000);
  const twoHoursTime = twoHours.toTimeString().slice(0, 8);

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
      const apptTime = appt.time;

      // Fetch barber name
      const { data: barber } = await supabase
        .from("barbers")
        .select("name")
        .eq("id", appt.barber_id)
        .single();

      const barberName = barber?.name || "your barber";

      const isSpanish = appt.lang?.toUpperCase() === "ES";

      const msgEN = `You have an appointment today at ${apptTime} with barber ${barberName}.`;
      const msgES = `Tienes una cita hoy a las ${apptTime} con el barbero ${barberName}.`;

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

      // ⭐ PUSH REMINDER (UPGRADED)
try {
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("subscription")
    .eq("user_id", appt.secret_link)
    .eq("role", "customer");

  if (!tokens || tokens.length === 0) {
    console.log("ℹ️ No push tokens for customer:", appt.secret_link);
  }

  for (const t of tokens || []) {
    await sendPushToSubscription(t.subscription, {
      title: isSpanish ? "Recordatorio de Cita" : "Appointment Reminder",
      message: finalMessage,
    });
  }

  console.log("📲 Push reminder sent:", tokens?.length || 0);
} catch (err) {
  console.error("❌ Push reminder error:", err);
}


      // MARK REMINDER AS SENT
      await supabase
        .from("appointments")
        .update({ reminder_sent: true })
        .eq("id", appt.id);

    } catch (err) {
      console.error("❌ Reminder Error:", err);
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
