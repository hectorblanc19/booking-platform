import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const businessId = new URL(req.url).searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      console.error("Missing Supabase configuration");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const authClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: { user }, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("id, owner_id, is_blocked")
      .eq("id", businessId)
      .maybeSingle();

    if (businessError) {
      console.error("Business lookup failed:", businessError);
      return NextResponse.json(
        { error: "Unable to verify business access" },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { data: adminRecord, error: adminError } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError) {
      console.error("Admin verification failed:", adminError);
      return NextResponse.json(
        { error: "Unable to verify administrator access" },
        { status: 500 }
      );
    }

    const isAdmin = Boolean(adminRecord);
    const isActiveOwner =
      business.owner_id === user.id && business.is_blocked !== true;

    if (!isAdmin && !isActiveOwner) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { data: appointments, error: appointmentsError } =
      await admin
        .from("appointments")
        .select("*")
        .eq("business_id", businessId)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

    if (appointmentsError) {
      console.error("Appointment lookup failed:", appointmentsError);
      return NextResponse.json(
        { error: "Unable to load appointments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      appointments: appointments || [],
    });
  } catch (error) {
    console.error("Business appointments API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}