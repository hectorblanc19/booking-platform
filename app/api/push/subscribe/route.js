import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const body = await req.json();
  const { userId, role, subscription } = body;

  if (!subscription || !userId || !role) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

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
