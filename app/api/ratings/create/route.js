import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ⭐ Server-side Supabase client (service role key required for updates)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      appointment_id,
      barber_id,
      business_id,
      customer_id,
      rating,
      review_text,   // ⭐ FIX: read correct field
    } = body;

    // ⭐ Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5." },
        { status: 400 }
      );
    }

    // ⭐ Insert rating into "ratings" table
    const { error: insertError } = await supabase.from("ratings").insert({
      appointment_id,
      barber_id,
      business_id,
      customer_id,
      rating,
      review_text,   // ⭐ FIX: save correct field
    });

    if (insertError) {
      console.error("Rating insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit rating." },
        { status: 500 }
      );
    }

    // ⭐ Mark appointment as rated (rating_submitted = true)
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ rating_submitted: true })
      .eq("id", appointment_id);

    if (updateError) {
      console.error("Appointment update error:", updateError);
      return NextResponse.json(
        { error: "Rating saved, but failed to update appointment." },
        { status: 500 }
      );
    }

    // ⭐ Success
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Rating API error:", err);
    return NextResponse.json(
      { error: "Server error submitting rating." },
      { status: 500 }
    );
  }
}
