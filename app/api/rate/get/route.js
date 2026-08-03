import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // ⭐ FIX: return appointment_id instead of id
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      barber_id,
      business_id,
      customer_id,
      service,
      date,
      time,
      notes,
      lang,
      rating_sent,
      rating_submitted,
      ratings (
        id,
        rating,
        review_text,
        created_at
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  // ⭐ FIX: rename id → appointment_id
  const response = {
    appointment_id: data.id,
    barber_id: data.barber_id,
    business_id: data.business_id,
    customer_id: data.customer_id,
    service: data.service,
    date: data.date,
    time: data.time,
    notes: data.notes,
    lang: data.lang,
    rating_sent: data.rating_sent,
    rating_submitted: data.rating_submitted,
    ratings: data.ratings,
  };

  return NextResponse.json(response, { status: 200 });
}
