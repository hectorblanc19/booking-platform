import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const token =
      typeof body?.secret === "string"
        ? body.secret.trim()
        : "";

    if (!token || token.length > 200) {
      return json({ success: false, error: "Invalid appointment link." }, 400);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
      console.error("Customer appointment API configuration is missing.");
      return json({ success: false, error: "Server configuration error." }, 500);
    }

    const admin = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const fields = [
      "id",
      "business_id",
      "barber_id",
      "provider_id",
      "date",
      "time",
      "duration",
      "customer_name",
      "customer_phone",
      "customer_email",
      "notes",
      "service",
      "status",
      "secret_link",
      "lang",
      "price",
      "guest_count",
      "pickup_location",
      "is_group_booking",
    ].join(", ");

    let { data: appointment, error } = await admin
      .from("appointments")
      .select(fields)
      .eq("secret_link", token)
      .maybeSingle();

    if (error) {
      console.error("Customer appointment lookup failed:", error);
      return json({ success: false, error: "Could not load appointment." }, 500);
    }

    if (!appointment) {
      return json({ success: false, error: "Appointment not found." }, 404);
    }

    return json({ success: true, appointment });
  } catch (error) {
    console.error("Customer appointment API error:", error);
    return json({ success: false, error: "Unexpected server error." }, 500);
  }
}
