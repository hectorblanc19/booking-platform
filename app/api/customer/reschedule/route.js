import { sendVerifiedAppointmentNotification } from "@/lib/verified-appointment-notifications.server";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function toMinutes(value) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(
    String(value ?? "")
  );
  if (!match) return NaN;

  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return NaN;

  return hours * 60 + mins;
}

function overlaps(startA, durationA, startB, durationB) {
  return (
    startA < startB + durationB &&
    startA + durationA > startB
  );
}

function getBusinessNow(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);

    const secret =
      typeof body?.secret === "string"
        ? body.secret.trim()
        : "";

    const date = body?.date;
    const time = body?.time;

    if (
      !secret ||
      secret.length > 200 ||
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      typeof time !== "string" ||
      !/^\d{2}:\d{2}(?::00)?$/.test(time)
    ) {
      return json(
        { success: false, error: "Invalid request." },
        400
      );
    }

    const start = toMinutes(time);
    const parsedDate = new Date(`${date}T12:00:00Z`);

    if (
      !Number.isFinite(start) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return json(
        { success: false, error: "Invalid date or time." },
        400
      );
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

    const { data: appointment, error: appointmentError } =
      await admin
        .from("appointments")
        .select(
          "id, secret_link, business_id, provider_id, barber_id, date, time, duration, status, is_group_booking"
        )
        .eq("secret_link", secret)
        .maybeSingle();

    if (appointmentError) {
      return json(
        { success: false, error: "Appointment lookup failed." },
        500
      );
    }

    if (!appointment) {
      return json(
        { success: false, error: "Appointment not found." },
        404
      );
    }

    // Preserve legacy barber and group booking behavior.
    if (
      !appointment.business_id ||
      !appointment.provider_id ||
      appointment.barber_id ||
      appointment.is_group_booking
    ) {
      return json(
        {
          success: false,
          error: "Unsupported appointment type.",
        },
        400
      );
    }

    const { data: timezoneBusiness, error: timezoneError } =
      await admin
        .from("businesses")
        .select("timezone")
        .eq("id", appointment.business_id)
        .maybeSingle();

    if (timezoneError || !timezoneBusiness?.timezone) {
      return json(
        { success: false, error: "Business timezone unavailable." },
        500
      );
    }

    const now = getBusinessNow(timezoneBusiness.timezone);

    if (
      date < now.date ||
      (date === now.date && start <= toMinutes(now.time))
    ) {
      return json(
        { success: false, error: "Cannot reschedule to a past time." },
        409
      );
    }
    // Reject rescheduling after the original appointment has started.
    const originalStart = toMinutes(appointment.time);

    if (
      !appointment.date ||
      !Number.isFinite(originalStart) ||
      appointment.date < now.date ||
      (appointment.date === now.date && originalStart <= toMinutes(now.time))
    ) {
      return json(
        {
          success: false,
          error: "This appointment can no longer be rescheduled.",
        },
        409
      );
    }
    if (appointment.status !== "confirmed") {
      return json(
        {
          success: false,
          error: "Appointment cannot be rescheduled.",
        },
        409
      );
    }

    // Prevent a no-op reschedule from updating the appointment
    // or triggering another notification.
    if (
      appointment.date === date &&
      originalStart === start
    ) {
      return json({
        success: true,
        already_scheduled: true,
        appointment: {
          id: appointment.id,
          date: appointment.date,
          time: appointment.time,
          status: appointment.status,
        },
      });
    }

    const duration = Number(appointment.duration ?? 60);

    if (
      !Number.isInteger(duration) ||
      duration <= 0 ||
      start + duration > 1440
    ) {
      return json(
        { success: false, error: "Invalid duration." },
        400
      );
    }

    const { data: business, error: businessError } =
      await admin
        .from("businesses")
        .select("id, is_blocked")
        .eq("id", appointment.business_id)
        .maybeSingle();

    if (businessError || !business) {
      return json(
        { success: false, error: "Business unavailable." },
        404
      );
    }

    if (business.is_blocked === true) {
      return json(
        { success: false, error: "Business is blocked." },
        403
      );
    }

    const dayOfWeek = parsedDate.getUTCDay();
    const { data: businessHours, error: businessHoursError } =
      await admin
        .from("business_hours")
        .select("open_time, close_time, is_open")
        .eq("business_id", appointment.business_id)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();

    if (businessHoursError) {
      return json(
        { success: false, error: "Business hours lookup failed." },
        500
      );
    }

    if (
      !businessHours ||
      businessHours.is_open !== true ||
      !Number.isFinite(toMinutes(businessHours.open_time)) ||
      !Number.isFinite(toMinutes(businessHours.close_time)) ||
      toMinutes(businessHours.close_time) <= toMinutes(businessHours.open_time) ||
      start < toMinutes(businessHours.open_time) ||
      start + duration > toMinutes(businessHours.close_time)
    ) {
      return json(
        { success: false, error: "Outside business operating hours." },
        409
      );
    }

    const { data: schedules, error: scheduleError } =
      await admin
        .from("provider_availability")
        .select("start_time, end_time, is_available")
        .eq("provider_id", appointment.provider_id)
        .eq("day_of_week", dayOfWeek);

    if (scheduleError) {
      return json(
        { success: false, error: "Schedule lookup failed." },
        500
      );
    }

    const withinWorkingHours = (schedules || []).some(
      (schedule) =>
        schedule.is_available === true &&
        start >= toMinutes(schedule.start_time) &&
        start + duration <= toMinutes(schedule.end_time)
    );

    if (!withinWorkingHours) {
      return json(
        {
          success: false,
          error: "Outside provider working hours.",
        },
        409
      );
    }

    const { data: blocks, error: blockError } =
      await admin
        .from("provider_blocks")
        .select("start_time, end_time")
        .eq("provider_id", appointment.provider_id)
        .eq("date", date);

    if (blockError) {
      return json(
        { success: false, error: "Blocked hours lookup failed." },
        500
      );
    }

    const blocked = (blocks || []).some((block) =>
      overlaps(
        start,
        duration,
        toMinutes(block.start_time),
        toMinutes(block.end_time) -
          toMinutes(block.start_time)
      )
    );

    if (blocked) {
      return json(
        { success: false, error: "Selected time is blocked." },
        409
      );
    }

    const { data: conflicts, error: conflictError } =
      await admin
        .from("appointments")
        .select("id, time, duration")
        .eq("provider_id", appointment.provider_id)
        .eq("date", date)
        .eq("status", "confirmed")
        .neq("id", appointment.id);

    if (conflictError) {
      return json(
        { success: false, error: "Availability lookup failed." },
        500
      );
    }

    const taken = (conflicts || []).some((other) =>
      overlaps(
        start,
        duration,
        toMinutes(other.time),
        Number(other.duration ?? 60)
      )
    );

    if (taken) {
      return json(
        { success: false, error: "Time already reserved." },
        409
      );
    }

    const formattedTime = `${time.slice(0, 5)}:00`;

    const { data: updated, error: updateError } =
      await admin
        .from("appointments")
        .update({
          date,
          time: formattedTime,
        })
        .eq("id", appointment.id)
        .eq("secret_link", secret)
        .eq("status", "confirmed")
        .eq("date", appointment.date)
        .eq("time", appointment.time)
        .select("id, date, time, status")
        .maybeSingle();

    if (updateError) {
      if (
        ["23P01", "23505", "23514"].includes(
          updateError.code
        )
      ) {
        return json(
          {
            success: false,
            error: "Selected time is no longer available.",
          },
          409
        );
      }

      console.error(
        "Rescheduling update error:",
        updateError.code
      );

      return json(
        { success: false, error: "Rescheduling failed." },
        500
      );
    }

    if (!updated) {
      return json(
        {
          success: false,
          error: "Appointment changed. Please reload.",
        },
        409
      );
    }

    try {
      await sendVerifiedAppointmentNotification({
        appointmentId: updated.id,
        notificationType: "reschedule",
      });
    } catch (notificationError) {
      console.error(
        "Secure rescheduling notification failed:",
        notificationError
      );
    }

    return json({
      success: true,
      appointment: updated,
    });
  } catch (error) {
    console.error("Rescheduling API error:", error);

    return json(
      { success: false, error: "Unexpected server error." },
      500
    );
  }
}
