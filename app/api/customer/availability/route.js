import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const toMinutes = (time) => {
  if (typeof time !== "string") return NaN;
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : NaN;
};

const overlaps = (a, aDuration, b, bDuration) =>
  a < b + bDuration && b < a + aDuration;

function businessNow(timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const fail = (error, status = 400) =>
  NextResponse.json({ success: false, error }, { status });

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const secret = typeof body?.secret === "string"
      ? body.secret.trim() : "";
    const date = body?.date;

    if (!secret || secret.length > 200 ||
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return fail("Invalid request.");
    }

    const parsed = new Date(`${date}T12:00:00Z`);
    if (Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date) {
      return fail("Invalid date.");
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return fail("Server configuration unavailable.", 500);

    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: appointment, error: appointmentError } = await admin
      .from("appointments")
      .select("id, business_id, provider_id, date, time, duration, status, is_group_booking")
      .eq("secret_link", secret)
      .maybeSingle();

    if (appointmentError) return fail("Appointment lookup failed.", 500);
    if (!appointment || !appointment.provider_id ||
        !appointment.business_id || appointment.is_group_booking ||
        appointment.status !== "confirmed") {
      return fail("Appointment unavailable.", 404);
    }

    const duration = Number(appointment.duration ?? 60);
    if (!Number.isInteger(duration) || duration <= 0 || duration > 1440) {
      return fail("Invalid duration.");
    }

    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("timezone, is_blocked")
      .eq("id", appointment.business_id)
      .maybeSingle();

    if (businessError || !business) return fail("Business unavailable.", 404);
    if (business.is_blocked) return fail("Business blocked.", 403);
    if (!business.timezone) return fail("Business timezone missing.", 500);

    let now;
    try {
      now = businessNow(business.timezone);
    } catch {
      return fail("Invalid business timezone.", 500);
    }

    if (date < now.date) {
      return NextResponse.json({ success: true, times: [] });
    }

    const originalStart = toMinutes(appointment.time);
    if (!Number.isFinite(originalStart) ||
        appointment.date < now.date ||
        (appointment.date === now.date && originalStart <= now.minutes)) {
      return fail("Appointment can no longer be rescheduled.", 409);
    }

    const dayOfWeek = parsed.getUTCDay();

    const [
      businessHoursResult,
      schedulesResult,
      blocksResult,
      conflictsResult,
    ] = await Promise.all([
      admin.from("business_hours")
        .select("open_time, close_time, is_open")
        .eq("business_id", appointment.business_id)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle(),
      admin.from("provider_availability")
        .select("start_time, end_time, is_available")
        .eq("provider_id", appointment.provider_id)
        .eq("day_of_week", dayOfWeek),
      admin.from("provider_blocks")
        .select("start_time, end_time")
        .eq("provider_id", appointment.provider_id)
        .eq("date", date),
      admin.from("appointments")
        .select("id, time, duration")
        .eq("provider_id", appointment.provider_id)
        .eq("date", date)
        .eq("status", "confirmed")
        .neq("id", appointment.id),
    ]);

    if (businessHoursResult.error || schedulesResult.error ||
        blocksResult.error || conflictsResult.error) {
      return fail("Availability lookup failed.", 500);
    }

    const hours = businessHoursResult.data;
    if (!hours?.is_open) {
      return NextResponse.json({ success: true, times: [] });
    }

    const opening = toMinutes(hours.open_time);
    const closing = toMinutes(hours.close_time);
    if (!Number.isFinite(opening) || !Number.isFinite(closing) ||
        closing <= opening) {
      return NextResponse.json({ success: true, times: [] });
    }

    const schedules = schedulesResult.data || [];
    const blocks = blocksResult.data || [];
    const conflicts = conflictsResult.data || [];
    const times = [];

    for (let start = opening; start + duration <= closing; start += 30) {
      if (date === now.date && start <= now.minutes) continue;

      const withinSchedule = schedules.some((s) =>
        s.is_available === true &&
        start >= toMinutes(s.start_time) &&
        start + duration <= toMinutes(s.end_time)
      );
      if (!withinSchedule) continue;

      const blocked = blocks.some((b) =>
        overlaps(start, duration, toMinutes(b.start_time),
          toMinutes(b.end_time) - toMinutes(b.start_time))
      );
      if (blocked) continue;

      const taken = conflicts.some((a) =>
        overlaps(start, duration, toMinutes(a.time),
          Number(a.duration ?? 60))
      );
      if (taken) continue;

      times.push(
        `${String(Math.floor(start / 60)).padStart(2, "0")}:` +
        `${String(start % 60).padStart(2, "0")}`
      );
    }

    return NextResponse.json({ success: true, times });
  } catch (error) {
    console.error("Customer availability error:", error);
    return fail("Availability request failed.", 500);
  }
}