import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const body = await req.json();
  const { subscription, role, secret_link, barber_id } = body;

  // ⭐ Validate required fields
  if (!subscription || !role) {
    return NextResponse.json(
      { error: "Missing fields: subscription and role are required" },
      { status: 400 }
    );
  }

  let userId;

  // ⭐ CUSTOMER (anonymous booking)
  if (role === "customer") {
    if (!secret_link) {
      return NextResponse.json(
        { error: "Missing secret_link for customer push subscription" },
        { status: 400 }
      );
    }
    userId = secret_link; // ⭐ MUST MATCH appointments.customer_id
  }

  // ⭐ BARBER (logged-in business user)
  if (role === "business") {
    if (!barber_id) {
      return NextResponse.json(
        { error: "Missing barber_id for business push subscription" },
        { status: 400 }
      );
    }
    userId = barber_id; // ⭐ MUST MATCH barbers.id
  }

  // ⭐ Save or update the push token
  const { error } = await supabase
    .from("push_tokens")
    .upsert({
      user_id: userId,
      role,
      subscription,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
