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

  // ⭐ FIX: include `lang` so rating page shows correct language
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
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  return NextResponse.json(data, { status: 200 });
}
