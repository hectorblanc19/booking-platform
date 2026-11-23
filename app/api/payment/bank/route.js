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
      return json({ success: false, error: "Invalid link." }, 400);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return json({ success: false, error: "Server configuration error." }, 500);
    }

    const admin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: appointment, error: appointmentError } = await admin
      .from("appointments")
      .select("business_id, group_id, customer_name, date, lang, service, price, status")
      .eq("secret_link", token)
      .maybeSingle();

    if (appointmentError) {
      console.error("Bank payment appointment lookup:", appointmentError);
      return json({ success: false, error: "Unable to load appointment." }, 500);
    }

    if (!appointment?.business_id) {
      return json({ success: false, error: "Appointment not found." }, 404);
    }

    if (["cancelled", "canceled"].includes(
      String(appointment.status || "").toLowerCase()
    )) {
      return json({ success: false, error: "Appointment is canceled." }, 400);
    }

    // Calculate the combined amount for active group appointments.
    let groupMembers = null;

    if (appointment.group_id) {
      const { data: members, error: groupError } = await admin
        .from("appointments")
        .select("customer_name, service, price, status")
        .eq("group_id", appointment.group_id)
        .eq("business_id", appointment.business_id);

      if (groupError) {
        console.error("Bank payment group lookup:", groupError);
        return json({ success: false, error: "Unable to load group booking." }, 500);
      }

      groupMembers = (members || []).filter(
        (member) =>
          !["cancelled", "canceled"].includes(
            String(member.status || "").toLowerCase()
          )
      );

      if (!groupMembers.length) {
        return json({ success: false, error: "No active group appointments." }, 400);
      }
    }

    const paymentPrice = groupMembers
      ? groupMembers.reduce((sum, member) => sum + Number(member.price || 0), 0)
      : appointment.price;

    const paymentService = groupMembers
      ? groupMembers.map((member) => `${member.customer_name}: ${member.service}`).join(" | ")
      : appointment.service;

    const { data: settings, error: settingsError } = await admin
      .from("business_payment_settings")
      .select(
        "bank_transfer_enabled, bank_name, account_holder, account_type, account_number, receipt_whatsapp"
      )
      .eq("business_id", appointment.business_id)
      .maybeSingle();

    if (settingsError) {
      console.error("Bank payment settings lookup:", settingsError);
      return json({ success: false, error: "Unable to load bank settings." }, 500);
    }

    if (!settings?.bank_transfer_enabled) {
      return json({ success: false, error: "Bank transfer is unavailable." }, 404);
    }

    return json({
      success: true,
      payment: {
        customer_name: appointment.customer_name,
        date: appointment.date,
        lang: appointment.lang,
        service: paymentService,
        price: paymentPrice,
        is_group: Boolean(groupMembers),
        group_members: groupMembers
          ? groupMembers.map(({ customer_name, service, price }) => ({
              customer_name,
              service,
              price,
            }))
          : null,
        bank_name: settings.bank_name,
        account_holder: settings.account_holder,
        account_type: settings.account_type,
        account_number: settings.account_number,
        receipt_whatsapp: settings.receipt_whatsapp,
      },
    });
  } catch (error) {
    console.error("Bank payment API error:", error);
    return json({ success: false, error: "Unexpected server error." }, 500);
  }
}
