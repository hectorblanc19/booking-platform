import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";  // ⭐ FIXED

export async function POST(req) {
  try {
    const supabase = createClient();
    const { barberId } = await req.json();

    if (!barberId) {
      return NextResponse.json(
        { error: "Missing barberId" },
        { status: 400 }
      );
    }

    // ⭐ Delete ratings first
    await supabase
      .from("ratings")
      .delete()
      .eq("barber_id", barberId);

    // ⭐ Delete gallery photos
    await supabase
      .from("barber_gallery")
      .delete()
      .eq("barber_id", barberId);

    // ⭐ Delete availability
    await supabase
      .from("barber_availability")
      .delete()
      .eq("barber_id", barberId);

    // ⭐ Delete appointments
    await supabase
      .from("appointments")
      .delete()
      .eq("barber_id", barberId);

    // ⭐ Delete barber record last
    await supabase
      .from("barbers")
      .delete()
      .eq("id", barberId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete barber error:", err);
    return NextResponse.json(
      { error: "Server error deleting barber" },
      { status: 500 }
    );
  }
}
