import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    lang
  } = body;

  // ⭐ Anonymous customers → use secret_link as customer_id
  const secret_link = crypto.randomUUID();
  const customer_id = secret_link;

  // ⭐ FIX: Use correct production domain
  const dashboardLink = `${process.env.NEXT_PUBLIC_BASE_URL}/customer/${customer_id}`;

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

  // ⭐ LOOKUP BARBER INFO
  const { data: barberInfo } = await supabase
    .from("barbers")
    .select("name, email")
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
      customer_id,   // secret_link
      status: "confirmed",
      secret_link,
      lang
    })
    .select()
    .single();

  if (error) {
    console.log("Supabase error:", error);
    return NextResponse.json({ error: "Failed to create appointment" });
  }

  // ⭐ SEND CUSTOMER CONFIRMATION EMAIL + PUSH (UPGRADED)
try {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-confirmation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customer_email,
      customer_name,
      service,
      barber_id: barber,
      business_id: business,
      date,
      time,
      secret_link,
      lang,
      customer_id
    })
  });
  console.log("📲 Customer confirmation sent");
} catch (err) {
  console.error("❌ Error sending customer confirmation:", err);
}


// ⭐ SEND BARBER EMAIL + PUSH (UPGRADED)
try {
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-barber-notification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      barber_email: barberInfo.email,
      barber_name: barberInfo.name,
      barber_id: barber,
      customer_name,
      customer_phone,
      customer_email,
      service,
      date,
      time,
      notes,
      dashboard_link: `${process.env.NEXT_PUBLIC_BASE_URL}/barber/${barber}/dashboard`,
      lang
    })
  });
  console.log("📲 Barber notification sent");
} catch (err) {
  console.error("❌ Error sending barber notification:", err);
}

  return NextResponse.json({
    success: true,
    dashboardLink,
    appointment: data
  });
}
