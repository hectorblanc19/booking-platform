import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

function json(body, status = 200) {
  return NextResponse.json(body, { status });
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value)
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
}

function overlaps(startA, durationA, startB, durationB) {
  const aStart = timeToMinutes(startA);
  const bStart = timeToMinutes(startB);

  return (
    aStart < bStart + Number(durationB) &&
    aStart + Number(durationA) > bStart
  );
}

function memberRequestId(groupId, index) {

  const bytes = createHash("sha256")
    .update(`${groupId}:${index}`)
    .digest();

  const hex = bytes.subarray(0, 16).toString("hex").split("");

  // Set UUID version 4 and RFC 4122 variant bits.
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);

  const id = hex.join("");

  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

async function sendGroupNotifications({
  appointments, business, provider, customerName,
  customerEmail, customerPhone, lang, groupId,
}) {
  const spanish = lang !== "en";
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.flowpaydr.com").replace(/\/$/, "");

  const ordered = [...appointments].sort((a, b) =>
    String(a.time).localeCompare(String(b.time))
  );

  if (!ordered.length) return;

  const formatTime = (value) => {
    const [h, m] = String(value).split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const formatDate = (value) => {
    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) return String(value);
    return new Intl.DateTimeFormat(spanish ? "es-DO" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  };

  const date = formatDate(ordered[0].date);
  const professionalName = provider.name || "";
  const totalDuration = ordered.reduce(
    (sum, appointment) => sum + Number(appointment.duration || 0), 0
  );
  const totalPrice = ordered.reduce(
    (sum, appointment) => sum + Number(appointment.price || 0), 0
  );

  const mapsLink = business.map_url ||
    (business.address
      ? `https://maps.google.com/?q=${encodeURIComponent(business.address)}`
      : "");

  const dashboardLink =
    `${baseUrl}/business/${encodeURIComponent(business.id)}/dashboard`;

  const detail = (label, value) => value
    ? `<p style="margin:8px 0;"><strong>${label}:</strong> ${escapeHtml(value)}</p>`
    : "";

  const button = (url, label, background = "#c99b35") => `
    <a href="${escapeHtml(url)}"
       style="display:inline-block;background:${background};color:#ffffff;
              padding:11px 17px;border-radius:8px;text-decoration:none;
              font-size:14px;font-weight:bold;margin-top:10px;">
      ${escapeHtml(label)}
    </a>`;

  const appointmentRows = ordered.map((appointment, index) => {
    const link = `${baseUrl}/customer/${encodeURIComponent(appointment.secret_link)}`;
    return `
      <tr>
        <td style="padding:15px 0;border-bottom:1px solid #e8e8e8;">
          <strong>${index + 1}. ${escapeHtml(appointment.customer_name)}</strong>
          ${detail(spanish ? "Servicio" : "Service", appointment.service)}
          ${detail(spanish ? "Hora" : "Time", formatTime(appointment.time))}
          ${detail(spanish ? "Duraci\u00f3n" : "Duration",
            `${Number(appointment.duration || 0)} min`)}
          ${button(link, spanish ? "Ver Cita" : "View Appointment")}
        </td>
      </tr>`;
  }).join("");

  const professionalRows = ordered.map((appointment, index) => `
    <tr>
      <td style="padding:15px 0;border-bottom:1px solid #e8e8e8;">
        <strong>${index + 1}. ${escapeHtml(appointment.customer_name)}</strong>
        ${detail(spanish ? "Servicio" : "Service", appointment.service)}
        ${detail(spanish ? "Hora" : "Time", formatTime(appointment.time))}
        ${detail(spanish ? "Duraci\u00f3n" : "Duration",
          `${Number(appointment.duration || 0)} min`)}
      </td>
    </tr>
  `).join("");

  const emailHtml = (heading, body) => `
    <div style="background:#f4f5f7;padding:24px 12px;font-family:Arial,sans-serif;color:#171717;">
      <div style="max-width:560px;margin:auto;background:white;border-radius:14px;overflow:hidden;">
        <div style="background:#101010;padding:24px;text-align:center;">
          <img src="https://www.flowpaydr.com/FlowPayDR%20Booking%20Gold%20Logo.png"
               alt="FlowPayDR" style="max-width:190px;width:100%;">
        </div>
        <div style="padding:24px;">
          <h2 style="margin-top:0;">${escapeHtml(heading)}</h2>
          ${body}
        </div>
        <div style="background:#f7f7f7;padding:18px;text-align:center;font-size:12px;color:#777;">
          FlowPayDR Booking &bull; info@flowpaydr.com
        </div>
      </div>
    </div>`;

  const summary = `
    ${detail(spanish ? "Negocio" : "Business", business.name)}
    ${detail(spanish ? "Profesional" : "Professional", professionalName)}
    ${detail(spanish ? "Fecha" : "Date", date)}
    ${detail(spanish ? "Duraci\u00f3n total" : "Total duration",
      `${totalDuration} min`)}
    ${detail(spanish ? "Precio total" : "Total price",
      `RD$ ${totalPrice.toFixed(2)}`)}
  `;

  // Optional bank transfer for the group organizer.
  let bankTransferEnabled = false;

  const { data: bankSettings, error: bankError } = await supabase
    .from("business_payment_settings")
    .select("bank_transfer_enabled")
    .eq("business_id", business.id)
    .maybeSingle();

  if (bankError) {
    console.error("Group bank settings lookup:", bankError);
  } else {
    bankTransferEnabled = bankSettings?.bank_transfer_enabled === true;
  }

  const bankPaymentHtml =
    bankTransferEnabled && ordered[0]?.secret_link
      ? `<div style="text-align:center;margin-top:22px;">
           <p style="font-size:13px;color:#666;">
             ${spanish
               ? "Si deseas pagar por transferencia bancaria, puedes hacerlo cuando quieras."
               : "If you prefer to pay by bank transfer, you can do so at your convenience."}
           </p>
           ${button(
             `${baseUrl}/payment/bank/${encodeURIComponent(ordered[0].secret_link)}?lang=${spanish ? "es" : "en"}`,
             spanish ? "Pagar por transferencia bancaria" : "Pay by Bank Transfer",
             "#1976d2"
           )}
         </div>`
      : "";

  const results = [];

  if (customerEmail) {
    const html = emailHtml(
      spanish ? "Reserva de grupo confirmada" : "Group Booking Confirmed",
      `<p>${spanish ? "Hola" : "Hello"} ${escapeHtml(customerName)},</p>
       <p>${spanish
         ? "Tu reserva de grupo ha sido confirmada."
         : "Your group booking has been confirmed."}</p>
       ${summary}
       ${detail(spanish ? "Direcci\u00f3n" : "Address", business.address)}
       ${detail(spanish ? "Tel\u00e9fono" : "Phone", business.phone)}
       ${mapsLink
         ? `<div style="margin:16px 0;">${button(
             mapsLink,
             spanish ? "Abrir en Google Maps" : "Open in Google Maps",
             "#171717"
           )}</div>`
         : ""}
       <h3>${spanish ? "Citas del grupo" : "Group appointments"}</h3>
       <table style="width:100%;border-collapse:collapse;">${appointmentRows}</table>${bankPaymentHtml}`
    );

    results.push({
      recipient: "organizer",
      promise: resend.emails.send({
        from: "FlowPayDR <info@flowpaydr.com>",
        to: customerEmail,
        subject: spanish
          ? "Tu reserva de grupo est\u00e1 confirmada"
          : "Your group booking is confirmed",
        html,
      }),
    });
  }

  if (provider.email) {
    const html = emailHtml(
      spanish ? "Nueva reserva de grupo" : "New Group Booking",
      `<p>${spanish
        ? "Tienes una nueva reserva de grupo."
        : "You have a new group booking."}</p>
       ${summary}
       <h3>${spanish ? "Detalles del cliente" : "Customer details"}</h3>
       ${detail(spanish ? "Nombre" : "Name", customerName)}
       ${detail(spanish ? "Tel\u00e9fono" : "Phone", customerPhone)}
       ${detail(spanish ? "Correo" : "Email", customerEmail)}
       <h3>${spanish ? "Citas del grupo" : "Group appointments"}</h3>
       <table style="width:100%;border-collapse:collapse;">${professionalRows}</table>
       <div style="text-align:center;margin-top:20px;">
         ${button(dashboardLink, spanish ? "Abrir Panel" : "Open Dashboard")}
       </div>`
    );

    results.push({
      recipient: "professional",
      promise: resend.emails.send({
        from: "FlowPayDR <info@flowpaydr.com>",
        to: provider.email,
        subject: spanish ? "Nueva reserva de grupo" : "New group booking",
        html,
      }),
    });
  }

  const settled = await Promise.allSettled(results.map((item) => item.promise));

  settled.forEach((result, index) => {
    if (result.status === "rejected" || result.value?.error) {
      console.error("Group notification failed:", {
        groupId,
        recipient: results[index].recipient,
        error: result.status === "rejected" ? result.reason : result.value.error,
      });
    }
  });
}
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      business_id,
      provider_id,
      date,
      time,
      members,
      customer_name,
      customer_phone,
      customer_email,
      booking_request_id,
      lang,
    } = body;

    if (
      !business_id ||
      !provider_id ||
      !date ||
      !time ||
      !customer_name ||
      !customer_phone ||
      !booking_request_id ||
      !Array.isArray(members) ||
      members.length < 2 ||
      members.length > 5
    ) {
      return json({
        success: false,
        code: "INVALID_REQUEST",
        error: "Invalid group booking information",
      }, 400);
    }

    // Validate the group request UUID.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (
      typeof booking_request_id !== "string" ||
      !uuidPattern.test(booking_request_id)
    ) {
      return json({
        success: false,
        code: "INVALID_REQUEST_ID",
        error: "Invalid group booking request ID",
      }, 400);
    }

    // Check for an existing group before availability validation.
    const { data: existingGroup, error: groupLookupError } =
      await supabase
        .from("appointments")
        .select("id, group_id, booking_request_id, business_id, provider_id, date, time, duration, customer_name, customer_email, customer_phone, selected_services, service, price, secret_link, status")
        .eq("group_id", booking_request_id);

    if (groupLookupError) {
      return json({
        success: false,
        code: "DATABASE_ERROR",
        error: "Could not verify existing group reservation",
      }, 500);
    }

    if (existingGroup && existingGroup.length > 0) {
      const ordered = [...existingGroup].sort((a, b) =>
        String(a.time).localeCompare(String(b.time))
      );

      const matches =
        ordered.length === members.length &&
        ordered.every((row, index) =>
          row.business_id === business_id &&
          row.provider_id === provider_id &&
          row.date === date &&
          row.booking_request_id === memberRequestId(booking_request_id, index) &&
          row.customer_name === members[index]?.name?.trim() &&
          row.customer_phone === customer_phone &&
          (row.customer_email || "") === (customer_email || "") &&
          row.status === "confirmed" &&
          Array.isArray(row.selected_services) &&
          row.selected_services.length === members[index]?.serviceIds?.length &&
          row.selected_services.every((service, serviceIndex) =>
            service.id === members[index].serviceIds[serviceIndex]
          )
        ) &&
        String(ordered[0].time).slice(0, 5) === String(time).slice(0, 5);

      if (!matches) {
        return json({
          success: false,
          code: "GROUP_RETRY_MISMATCH",
          error: "This booking request ID belongs to a different reservation",
        }, 409);
      }

      return json({
        success: true,
        group_id: booking_request_id,
        appointments: ordered.map((row) => ({
          id: row.id,
          group_id: row.group_id,
          secret_link: row.secret_link,
          date: row.date,
          time: row.time,
          duration: row.duration,
          customer_name: row.customer_name,
          service: row.service,
          price: row.price,
        })),
        already_booked: true,
      });
    }

    // Verify business.
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, is_blocked, timezone, address, phone, map_url")
      .eq("id", business_id)
      .maybeSingle();

    if (businessError || !business) {
      return json({
        success: false,
        code: "BUSINESS_NOT_FOUND",
        error: "Business not found",
      }, 404);
    }

    if (business.is_blocked === true) {
      return json({
        success: false,
        code: "BUSINESS_BLOCKED",
        error: "This business is temporarily unavailable",
      }, 403);
    }

    // Verify professional belongs to this business.
    const { data: provider, error: providerError } = await supabase
      .from("providers")
      .select("id, name, email, business_id")
      .eq("id", provider_id)
      .eq("business_id", business_id)
      .maybeSingle();

    if (providerError || !provider) {
      return json({
        success: false,
        code: "PROVIDER_NOT_FOUND",
        error: "Professional not found",
      }, 404);
    }

    // Validate group members and selected services.
    if (members.some((member) =>
      !member ||
      typeof member.name !== "string" ||
      !member.name.trim() ||
      member.name.trim().length > 150 ||
      !Array.isArray(member.serviceIds) ||
      member.serviceIds.length < 1 ||
      member.serviceIds.length > 10 ||
      member.serviceIds.some((id) => typeof id !== "string" || !id.trim()) ||
      new Set(member.serviceIds).size !== member.serviceIds.length
    )) {
      return json({
        success: false,
        code: "INVALID_MEMBERS",
        error: "Each person needs a name and valid services",
      }, 400);
    }

    const requestedIds = [...new Set(members.flatMap((member) => member.serviceIds))];

    const { data: serviceRecords, error: serviceError } = await supabase
      .from("business_services")
      .select("id, business_id, provider_id, name, price, duration, is_active")
      .in("id", requestedIds)
      .eq("business_id", business_id)
      .or(`provider_id.eq.${provider_id},provider_id.is.null`)
      .eq("is_active", true);

    if (serviceError || !serviceRecords || serviceRecords.length !== requestedIds.length) {
      return json({
        success: false,
        code: "SERVICE_NOT_FOUND",
        error: "One or more selected services are unavailable",
      }, 404);
    }

    const servicesById = new Map(serviceRecords.map((item) => [item.id, item]));

    const groupAppointments = members.map((member) => {
      const selectedServices = member.serviceIds.map((id) => {
        const item = servicesById.get(id);

        return {
          id: item.id,
          name: item.name,
          duration: Number(item.duration),
          price: Number(item.price),
        };
      });

      return {
        name: member.name.trim(),
        selectedServices,
        service: selectedServices.map((item) => item.name).join(" + "),
        duration: selectedServices.reduce((sum, item) => sum + item.duration, 0),
        price: selectedServices.reduce((sum, item) => sum + item.price, 0),
      };
    });

    if (groupAppointments.some((appointment) =>
      appointment.selectedServices.some((item) =>
        !Number.isFinite(item.duration) ||
        !Number.isInteger(item.duration) ||
        item.duration <= 0 ||
        !Number.isFinite(item.price) ||
        item.price < 0
      )
    )) {
      return json({
        success: false,
        code: "INVALID_SERVICE_VALUES",
        error: "Invalid service price or duration",
      }, 400);
    }

    const totalDuration = groupAppointments.reduce(
      (sum, appointment) => sum + appointment.duration, 0
    );

    const totalPrice = groupAppointments.reduce(
      (sum, appointment) => sum + appointment.price, 0
    );

    // Validate the booking date and time.
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      typeof time !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)
    ) {
      return json({
        success: false,
        code: "INVALID_DATETIME",
        error: "Invalid booking date or time",
      }, 400);
    }

    const [year, month, day] = date.split("-").map(Number);
    const bookingDate = new Date(Date.UTC(year, month - 1, day));

    if (
      bookingDate.getUTCFullYear() !== year ||
      bookingDate.getUTCMonth() !== month - 1 ||
      bookingDate.getUTCDate() !== day
    ) {
      return json({
        success: false,
        code: "INVALID_DATE",
        error: "Invalid calendar date",
      }, 400);
    }

    const appointmentStart = timeToMinutes(time);
    const appointmentEnd = appointmentStart + totalDuration;

    if (
      !Number.isFinite(appointmentStart) ||
      !Number.isFinite(totalDuration) ||
      totalDuration <= 0 ||
      appointmentEnd > 1440
    ) {
      return json({
        success: false,
        code: "INVALID_DURATION",
        error: "Group duration is invalid",
      }, 400);
    }

    // Use the business timezone when checking past appointments.
    const nowParts = new Intl.DateTimeFormat("en-US", {
      timeZone: business.timezone || "America/Santo_Domingo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    const nowValues = Object.fromEntries(
      nowParts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value])
    );

    const todayBusiness =
      `${nowValues.year}-${nowValues.month}-${nowValues.day}`;

    const currentMinutesBusiness =
      Number(nowValues.hour) * 60 + Number(nowValues.minute);

    if (
      date < todayBusiness ||
      (date === todayBusiness && appointmentStart <= currentMinutesBusiness)
    ) {
      return json({
        success: false,
        code: "PAST_APPOINTMENT",
        error: "Cannot book an appointment in the past",
      }, 409);
    }

    const dayOfWeek = bookingDate.getUTCDay();

    // Business hours.
    const { data: businessHours, error: businessHoursError } =
      await supabase
        .from("business_hours")
        .select("open_time, close_time, is_open")
        .eq("business_id", business_id)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();

    if (businessHoursError) {
      return json({
        success: false,
        code: "DATABASE_ERROR",
        error: "Could not verify business hours",
      }, 500);
    }

    if (
      !businessHours ||
      businessHours.is_open !== true ||
      !businessHours.open_time ||
      !businessHours.close_time ||
      appointmentStart < timeToMinutes(businessHours.open_time) ||
      appointmentEnd > timeToMinutes(businessHours.close_time)
    ) {
      return json({
        success: false,
        code: "OUTSIDE_BUSINESS_HOURS",
        error: "Group booking is outside business hours",
      }, 409);
    }

    // Professional working hours.
    const { data: providerHours, error: providerHoursError } =
      await supabase
        .from("provider_availability")
        .select("start_time, end_time, is_available")
        .eq("provider_id", provider_id)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();

    if (providerHoursError) {
      return json({
        success: false,
        code: "DATABASE_ERROR",
        error: "Could not verify professional hours",
      }, 500);
    }

    if (
      !providerHours ||
      providerHours.is_available !== true ||
      !providerHours.start_time ||
      !providerHours.end_time ||
      appointmentStart < timeToMinutes(providerHours.start_time) ||
      appointmentEnd > timeToMinutes(providerHours.end_time)
    ) {
      return json({
        success: false,
        code: "OUTSIDE_PROVIDER_HOURS",
        error: "Group booking is outside professional hours",
      }, 409);
    }

    // Existing confirmed appointments.
    const { data: existingAppointments, error: existingError } =
      await supabase
        .from("appointments")
        .select("time, duration")
        .eq("provider_id", provider_id)
        .eq("date", date)
        .eq("status", "confirmed");

    if (existingError) {
      return json({
        success: false,
        code: "DATABASE_ERROR",
        error: "Could not check existing appointments",
      }, 500);
    }

    const appointmentConflict = (existingAppointments || []).some(
      (appointment) =>
        overlaps(
          time,
          totalDuration,
          appointment.time,
          Number(appointment.duration) || 60
        )
    );

    if (appointmentConflict) {
      return json({
        success: false,
        code: "SLOT_TAKEN",
        error: "The selected time is already booked",
      }, 409);
    }

    // Professional blocks.
    const { data: providerBlocks, error: blocksError } =
      await supabase
        .from("provider_blocks")
        .select("start_time, end_time")
        .eq("provider_id", provider_id)
        .eq("date", date);

    if (blocksError) {
      return json({
        success: false,
        code: "DATABASE_ERROR",
        error: "Could not check professional blocks",
      }, 500);
    }

    const blocked = (providerBlocks || []).some((block) =>
      overlaps(
        time,
        totalDuration,
        block.start_time,
        timeToMinutes(block.end_time) -
          timeToMinutes(block.start_time)
      )
    );

    if (blocked) {
      return json({
        success: false,
        code: "PROVIDER_BLOCKED",
        error: "Professional is unavailable during this group booking",
      }, 409);
    }

    // Create sequential appointments for all group members.
    let nextStart = appointmentStart;

    const appointmentRows = groupAppointments.map((member, index) => {
      const startTime = minutesToTime(nextStart);
      nextStart += member.duration;

      return {
        business_id,
        barber_id: null,
        provider_id,
        group_id: booking_request_id,
        booking_request_id: memberRequestId(booking_request_id, index),
        is_group_booking: false,
        service_id: member.selectedServices[0].id,
        selected_services: member.selectedServices,
        service: member.service,
        date,
        time: startTime,
        duration: member.duration,
        price: member.price,
        customer_name: member.name,
        group_organizer_name: customer_name,
        customer_phone,
        customer_email: customer_email || null,
        notes: "",
        status: "confirmed",
        secret_link: crypto.randomUUID(),
        lang: lang || "es",
      };
    });

    // One database insert: all members succeed or none do.
    const { data: savedAppointments, error: saveError } =
      await supabase
        .from("appointments")
        .insert(appointmentRows)
        .select("id, group_id, secret_link, date, time, duration, customer_name, service, price");

    if (saveError) {
      console.error("Group booking insert error:", saveError);

      if (saveError.code === "23P01" || saveError.code === "23505") {
        return json({
          success: false,
          code: "SLOT_TAKEN",
          error: "The selected time is no longer available",
        }, 409);
      }

      return json({
        success: false,
        code: "SAVE_FAILED",
        error: "Could not save group appointments",
      }, 500);
    }

    // Send notifications only for newly created group reservations.
    // Email failures must never cancel successfully saved appointments.
    try {
      await sendGroupNotifications({
        appointments: savedAppointments,
        business,
        provider,
        customerName: customer_name,
        customerEmail: customer_email,
        customerPhone: customer_phone,
        lang,
        groupId: booking_request_id,
      });
    } catch (notificationError) {
      console.error("Group notification error:", notificationError);
    }

    return json({
      success: true,
      group_id: booking_request_id,
      appointments: savedAppointments,
      total_duration: totalDuration,
      total_price: totalPrice,
    });

  } catch (error) {
    console.error("Group booking error:", error);

    return json({
      success: false,
      code: "SERVER_ERROR",
      error: "Unable to process group booking",
    }, 500);
  }
}