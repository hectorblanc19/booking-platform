import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const body = await req.json();
  const { subscription, role, secret_link, barber_id } = body;

  // Validate required fields
  if (!subscription || !role) {
    return NextResponse.json(
      { error: "Missing fields: subscription and role are required" },
      { status: 400 }
    );
  }

  let userId;

  // CUSTOMER
  if (role === "customer") {
    if (!secret_link) {
      return NextResponse.json(
        { error: "Missing secret_link for customer push subscription" },
        { status: 400 }
      );
    }
    userId = secret_link;
  }

  // BARBER
  if (role === "business") {
    if (!barber_id) {
      return NextResponse.json(
        { error: "Missing barber_id for business push subscription" },
        { status: 400 }
      );
    }
    userId = barber_id;
  }

  // ⭐ Generate a hash to prevent duplicate tokens
  const subscription_hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(subscription))
    .digest("hex");

  // ⭐ Upsert (insert or update) the token
  const { error } = await supabase
    .from("push_tokens")
    .upsert(
      {
        user_id: userId,
        role,
        subscription,
        subscription_hash,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id, subscription_hash",
      }
    );

  if (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
