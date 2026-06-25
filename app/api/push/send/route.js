export const runtime = "nodejs";

import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  // ⭐ Move VAPID config INSIDE the handler
  webpush.setVapidDetails(
    "mailto:admin@flowpaydr.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const body = await req.json();
  const { userId, role, title, message } = body;

  if (!userId || !role || !title || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Get push token for this user
  const { data, error } = await supabase
    .from("push_tokens")
    .select("subscription")
    .eq("user_id", userId)
    .eq("role", role)
    .single();

  if (error || !data) {
    console.error("Push token not found:", error);
    return NextResponse.json({ error: "No push token" }, { status: 404 });
  }

  try {
    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({ title, message })
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Push send error:", err);
    return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
  }
}
