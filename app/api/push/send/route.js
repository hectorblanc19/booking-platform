import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const body = await req.json();
  const { role, barber_id, secret_link, title, message } = body;

  if (!role || (!barber_id && !secret_link)) {
    return NextResponse.json(
      { error: "Missing role or user identifier" },
      { status: 400 }
    );
  }

  // Identify user
  const userId = role === "business" ? barber_id : secret_link;

  // Get push token
  const { data: tokens, error } = await supabase
    .from("push_tokens")
    .select("*")
    .eq("user_id", userId);

  if (error || !tokens || tokens.length === 0) {
    return NextResponse.json({ error: "No push token found" }, { status: 404 });
  }

  // Configure VAPID
  webpush.setVapidDetails(
    "mailto:admin@flowpaydr.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  // Send notification
  for (const token of tokens) {
    try {
      await webpush.sendNotification(
        token.subscription,
        JSON.stringify({
          title,
          message,
        })
      );
    } catch (err) {
      console.error("Push send error:", err);
    }
  }

  return NextResponse.json({ success: true });
}
