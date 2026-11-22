import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(body, status = 200) {
  return NextResponse.json(body, { status });
}

function timeToMinutes(value) {
  if (!value) return 0;

  const [hours, minutes] = String(value)
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function overlaps(startA, durationA, startB, durationB) {
  const aStart = timeToMinutes(startA);
  const aEnd = aStart + Number(durationA || 60);

  const bStart = timeToMinutes(startB);
  const bEnd = bStart + Number(durationB || 60);

  return aStart < bEnd && aEnd > bStart;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      // Legacy system
      barber,

      // New business/provider system
      business,
      business_id,
      provider_id,
      service_id,
      service_ids,

      // Common fields
      service,
      date,
      time,
      duration,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      lang,
      price,
      booking_request_id,
    } = body;

    const resolvedBusinessId =
      business_id || business || null;

    const isProviderBooking = Boolean(
      resolvedBusinessId &&
      provider_id &&
      service_id
    );

    const isLegacyBarberBooking = Boolean(barber);

    // =========================================================
    // 1. REQUIRED FIELDS
    // =========================================================

    if (
      (!isProviderBooking && !isLegacyBarberBooking) ||
      !date ||
      !time ||
      !customer_name ||
      !customer_phone ||
      !booking_request_id
    ) {
      return json(
        {
          success: false,
          code: "MISSING_FIELDS",
          error: "Missing required fields",
        },
        400
      );
    }

    if (
      isLegacyBarberBooking &&
      (!service || !customer_email)
    ) {
      return json(
        {
          success: false,
          code: "MISSING_FIELDS",
          error: "Missing required fields",
        },
        400
      );
    }

    const cleanCustomerPhone = String(
      customer_phone
    ).replace(/\D/g, "");

    const formattedTime =
      String(time).length === 5
        ? `${time}:00`
        : String(time);

    // =========================================================
    // 2. IDEMPOTENCY CHECK
    const sameBookingRequest = (existing) => {
      const normalizePhone = (value) =>
        String(value ?? "").replace(/\D/g, "");

      const normalizeTime = (value) =>
        String(value ?? "").slice(0, 5);

      const sameCustomer =
        String(existing.customer_name ?? "").trim() ===
          String(customer_name ?? "").trim() &&
        normalizePhone(existing.customer_phone) ===
          normalizePhone(customer_phone);

      const sameSlot =
        String(existing.date ?? "") === String(date ?? "") &&
        normalizeTime(existing.time) === normalizeTime(time);

      const sameBusiness =
        String(existing.business_id ?? "") ===
          String(resolvedBusinessId ?? "");

      if (isProviderBooking) {
        return (
          sameCustomer &&
          sameSlot &&
          sameBusiness &&
          String(existing.provider_id ?? "") === String(provider_id ?? "") &&
          JSON.stringify(
            (existing.selected_services?.length
              ? existing.selected_services.map((item) => item.id)
              : [existing.service_id]
            ).map(String)
          ) ===
          JSON.stringify(
            (Array.isArray(service_ids) ? service_ids : [service_id]).map(String)
          )
        );
      }

      return (
        sameCustomer &&
        sameSlot &&
        sameBusiness &&
        String(existing.barber_id ?? "") === String(barber ?? "") &&
        String(existing.service ?? "").trim() === String(service ?? "").trim()
      );
    };

    // =========================================================

    const {
      data: priorAppointment,
      error: priorError,
    } = await supabase
      .from("appointments")
      .select("*")
      .eq(
        "booking_request_id",
        booking_request_id
      )
      .maybeSingle();

    if (priorError) {
      console.error(
        "Idempotency lookup failed:",
        priorError
      );

      return json(
        {
          success: false,
          code: "DATABASE_ERROR",
          error: "Could not verify booking request",
        },
        500
      );
    }

    if (priorAppointment) {
      if (!sameBookingRequest(priorAppointment)) {
        return json({
          success: false,
          code: "BOOKING_REQUEST_CONFLICT",
          error: "Booking request cannot be reused",
        }, 409);
      }
      return json({
        success: true,
        already_created: true,
        secret_link: priorAppointment.secret_link,
        appointment: {
          id: priorAppointment.id,
          secret_link: priorAppointment.secret_link,
        },
      });
    }

    // =========================================================
    // 3. VALUES USED FOR INSERT
    // =========================================================

    let finalService = service || "";

    let finalDuration =
      Number(duration) > 0 ? Number(duration) : 60;

    let finalPrice = price ?? 0;

    let providerInfo = null;
    let selectedServices = null;

 // =========================================================
// 4. NEW BUSINESS / PROVIDER BOOKING
// =========================================================

if (isProviderBooking) {
  // Verify business exists and check blocked status
  const {
    data: businessInfo,
    error: businessError,
  } = await supabase
    .from("businesses")
    .select("id, name, is_blocked, timezone")
    .eq("id", resolvedBusinessId)
    .maybeSingle();

  if (businessError || !businessInfo) {
    console.error("Business lookup failed:", businessError);

    return json(
      {
        success: false,
        code: "BUSINESS_NOT_FOUND",
        error: "Business not found",
      },
      404
    );
  }

  // Prevent bookings for blocked businesses
  if (businessInfo.is_blocked === true) {
    return json(
      {
        success: false,
        code: "BUSINESS_BLOCKED",
        error:
          lang === "en"
            ? "This page is temporarily unavailable. Please contact administration."
            : "Esta pÃ¡gina no estÃ¡ disponible temporalmente. Por favor, comunÃ­quese con la administraciÃ³n.",
      },
      403
    );
  }

  // Verify provider belongs to this business
  const {
    data: foundProvider,
    error: providerError,
  } = await supabase
    .from("providers")
    .select("id, name, email, business_id")
    .eq("id", provider_id)
    .eq("business_id", resolvedBusinessId)
    .maybeSingle();

  if (providerError || !foundProvider) {
    console.error("Provider lookup failed:", providerError);

    return json(
      {
        success: false,
        code: "PROVIDER_NOT_FOUND",
        error: "Provider not found",
      },
      404
    );
  }

  providerInfo = foundProvider;

  // Validate all selected services using database values.
  const requestedServiceIds = Array.isArray(service_ids)
    ? service_ids
    : [service_id];

  if (
    requestedServiceIds.length === 0 ||
    requestedServiceIds.length > 10 ||
    requestedServiceIds.some(
      (id) => typeof id !== "string" || !id.trim()
    ) ||
    new Set(requestedServiceIds).size !== requestedServiceIds.length
  ) {
    return json(
      {
        success: false,
        code: "INVALID_SERVICES",
        error: "Invalid service selection",
      },
      400
    );
  }

  const { data: serviceRecords, error: serviceError } = await supabase
    .from("business_services")
    .select("id, business_id, provider_id, name, price, duration, is_active")
    .in("id", requestedServiceIds)
    .eq("business_id", resolvedBusinessId)
    .or(`provider_id.eq.${provider_id},provider_id.is.null`)
    .eq("is_active", true);

  if (
    serviceError ||
    !serviceRecords ||
    serviceRecords.length !== requestedServiceIds.length
  ) {
    return json(
      {
        success: false,
        code: "SERVICE_NOT_FOUND",
        error: "One or more services are unavailable",
      },
      404
    );
  }

  const servicesById = new Map(
    serviceRecords.map((item) => [item.id, item])
  );

  selectedServices = requestedServiceIds.map((id) => {
    const item = servicesById.get(id);
    return {
      id: item.id,
      name: item.name,
      duration: Number(item.duration),
      price: Number(item.price),
    };
  });

  if (
    selectedServices.some(
      (item) =>
        !Number.isFinite(item.duration) ||
        !Number.isInteger(item.duration) ||
        item.duration <= 0 ||
        !Number.isFinite(item.price) ||
        item.price < 0
    )
  ) {
    return json(
      {
        success: false,
        code: "INVALID_SERVICE_VALUES",
        error: "Service price or duration is not configured correctly",
      },
      400
    );
  }

  finalService = selectedServices.map((item) => item.name).join(" + ");
  finalDuration = selectedServices.reduce(
    (total, item) => total + item.duration,
    0
  );
  finalPrice = selectedServices.reduce(
    (total, item) => total + item.price,
    0
  );

      // Validate provider booking date and time.
      const dateMatch = typeof date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(date);

      const timeMatch = typeof time === "string" &&
        /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time);

      if (!dateMatch || !timeMatch) {
        return json({
          success: false,
          code: "INVALID_DATETIME",
          error: "Invalid appointment date or time",
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

      // Reject past provider appointments using the business timezone.
      const nowParts = new Intl.DateTimeFormat("en-US", {
        timeZone: businessInfo?.timezone || "America/Santo_Domingo",
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

      const todayBusiness = `${nowValues.year}-${nowValues.month}-${nowValues.day}`;
      const currentMinutesBusiness =
        Number(nowValues.hour) * 60 + Number(nowValues.minute);

      if (
        date < todayBusiness ||
        (date === todayBusiness &&
          timeToMinutes(formattedTime) <= currentMinutesBusiness)
      ) {
        return json({
          success: false,
          code: "PAST_APPOINTMENT",
          error: "Cannot book an appointment in the past",
        }, 409);
      }

      const dayOfWeek = bookingDate.getUTCDay();
      const appointmentStart = timeToMinutes(formattedTime);
      const appointmentEnd = appointmentStart + finalDuration;

      if (
        !Number.isFinite(finalDuration) ||
        finalDuration <= 0 ||
        !Number.isFinite(appointmentEnd) ||
        appointmentEnd > 1440
      ) {
        return json({
          success: false,
          code: "INVALID_DURATION",
          error: "Invalid appointment duration",
        }, 400);
      }

      // Enforce business opening hours.
      const { data: businessHours, error: businessHoursError } =
        await supabase
          .from("business_hours")
          .select("open_time, close_time, is_open")
          .eq("business_id", resolvedBusinessId)
          .eq("day_of_week", dayOfWeek)
          .maybeSingle();

      if (businessHoursError) {
        console.error("Business hours lookup failed:", businessHoursError);
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
          error: "Appointment is outside business hours",
        }, 409);
      }

      // Enforce selected professional's working hours.
      const { data: providerHours, error: providerHoursError } =
        await supabase
          .from("provider_availability")
          .select("start_time, end_time, is_available")
          .eq("provider_id", provider_id)
          .eq("day_of_week", dayOfWeek)
          .maybeSingle();

      if (providerHoursError) {
        console.error("Provider hours lookup failed:", providerHoursError);
        return json({
          success: false,
          code: "DATABASE_ERROR",
          error: "Could not verify professional hours",
        }, 500);
      }

      if (
        !providerHours ||
        providerHours.is_available !== true ||
        appointmentStart < timeToMinutes(providerHours.start_time) ||
        appointmentEnd > timeToMinutes(providerHours.end_time)
      ) {
        return json({
          success: false,
          code: "OUTSIDE_PROVIDER_HOURS",
          error: "Appointment is outside professional working hours",
        }, 409);
      }
      // Check existing confirmed appointments
      const {
        data: existingAppointments,
        error: existingError,
      } = await supabase
        .from("appointments")
        .select("id, time, duration")
        .eq("provider_id", provider_id)
        .eq("date", date)
        .eq("status", "confirmed");

      if (existingError) {
        console.error(
          "Provider appointment lookup failed:",
          existingError
        );

        return json(
          {
            success: false,
            code: "DATABASE_ERROR",
            error: "Could not check availability",
          },
          500
        );
      }

      const appointmentConflict = (
        existingAppointments || []
      ).some((appointment) =>
        overlaps(
          formattedTime,
          finalDuration,
          appointment.time,
          Number(appointment.duration) || 60
        )
      );

      if (appointmentConflict) {
        return json(
          {
            success: false,
            code: "SLOT_TAKEN",
            error: "Time slot already taken",
          },
          409
        );
      }

      // Check provider blocks
      const {
        data: providerBlocks,
        error: blocksError,
      } = await supabase
        .from("provider_blocks")
        .select("start_time, end_time")
        .eq("provider_id", provider_id)
        .eq("date", date);

      if (blocksError) {
        console.error(
          "Provider block lookup failed:",
          blocksError
        );

        return json(
          {
            success: false,
            code: "DATABASE_ERROR",
            error: "Could not check provider blocks",
          },
          500
        );
      }

      const blocked = (providerBlocks || []).some(
        (block) => {
          const blockDuration =
            timeToMinutes(block.end_time) -
            timeToMinutes(block.start_time);

          return overlaps(
            formattedTime,
            finalDuration,
            block.start_time,
            blockDuration
          );
        }
      );

      if (blocked) {
        return json(
          {
            success: false,
            code: "PROVIDER_BLOCKED",
            error: "Provider unavailable at this time",
          },
          409
        );
      }
    }

    // =========================================================
    // 5. LEGACY BARBER BOOKING
    // =========================================================

    if (isLegacyBarberBooking) {
      const {
        data: existingAppointments,
        error: existingError,
      } = await supabase
        .from("appointments")
        .select("id, date, time, duration")
        .eq("barber_id", barber)
        .eq("date", date)
        .eq("status", "confirmed");

      if (existingError) {
        console.error(
          "Barber availability lookup failed:",
          existingError
        );

        return json(
          {
            success: false,
            code: "DATABASE_ERROR",
            error: "Could not check availability",
          },
          500
        );
      }

      const appointmentConflict = (
        existingAppointments || []
      ).some((appointment) =>
        overlaps(
          formattedTime,
          finalDuration,
          appointment.time,
          Number(appointment.duration) || 60
        )
      );

      if (appointmentConflict) {
        return json(
          {
            success: false,
            code: "SLOT_TAKEN",
            error: "Time slot already taken",
          },
          409
        );
      }
    }

    // =========================================================
    // 6. CREATE CUSTOMER SECRET
    // =========================================================

    const secret_link = crypto.randomUUID();
    const customer_id = secret_link;

    // =========================================================
    // 7. CREATE APPOINTMENT
    // =========================================================

    const appointmentPayload = isProviderBooking
      ? {
          business_id: resolvedBusinessId,
          barber_id: null,
          provider_id,
          service_id: selectedServices[0].id,
          selected_services: selectedServices,

          service: finalService,
          date,
          time: formattedTime,
          duration: finalDuration,

          customer_name,
          customer_email: customer_email || null,
          customer_phone: cleanCustomerPhone,
          notes: notes || "",

          customer_id,
          status: "confirmed",
          secret_link,

          lang: lang || "es",
          price: finalPrice,

          booking_request_id,
        }
      : {
          business_id: resolvedBusinessId,
          barber_id: barber,

          service: finalService,
          date,
          time: formattedTime,
          duration: finalDuration,

          customer_name,
          customer_email,
          customer_phone: cleanCustomerPhone,
          notes: notes || "",

          customer_id,
          status: "confirmed",
          secret_link,

          lang: lang || "es",
          price: finalPrice,

          booking_request_id,
        };

    const {
      data: appointment,
      error: insertError,
    } = await supabase
      .from("appointments")
      .insert(appointmentPayload)
      .select()
      .single();

       // =========================================================
    // 8. IDEMPOTENCY / UNIQUE-CONSTRAINT HANDLING
    // =========================================================

    if (insertError) {
      // Database safeguard: reject bookings during blocked hours.
      if (
        insertError.code === "23514" &&
        insertError.message?.includes("PROVIDER_BLOCKED")
      ) {
        return json(
          {
            success: false,
            code: "PROVIDER_BLOCKED",
            error: "Provider unavailable at this time",
          },
          409
        );
      }

      // Handle PostgreSQL provider-overlap exclusion violations.
      if (insertError.code === "23P01") {
        return json(
          {
            success: false,
            code: "SLOT_TAKEN",
            error: "Time slot already taken",
          },
          409
        );
      }

      // Keep existing duplicate-booking protection.
      if (insertError.code === "23505") {
        const { data: sameRequest } = await supabase
          .from("appointments")
          .select("*")
          .eq(
            "booking_request_id",
            booking_request_id
          )
          .maybeSingle();

        if (sameRequest) {
          if (!sameBookingRequest(sameRequest)) {
            return json({
              success: false,
              code: "BOOKING_REQUEST_CONFLICT",
              error: "Booking request cannot be reused",
            }, 409);
          }
          return json({
            success: true,
            already_created: true,
            secret_link: sameRequest.secret_link,
            appointment: {
              id: sameRequest.id,
              secret_link: sameRequest.secret_link,
            },
          });
        }

        return json(
          {
            success: false,
            code: "SLOT_TAKEN",
            error: "Time slot already taken",
          },
          409
        );
      }

      console.error(
        "Appointment insert failed:",
        insertError
      );

      return json(
        {
          success: false,
          code: "DATABASE_ERROR",
          error: "Failed to create appointment",
        },
        500
      );
    }

    // =========================================================
    // 9. NOTIFICATIONS
    // =========================================================
    // Appointment is already stored. Notification failures
    // must never make the customer think booking failed.
    // =========================================================

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://www.flowpaydr.com";


    const notificationJobs = [];

    // Customer confirmation
    if (customer_email) {
      notificationJobs.push(
        fetch(`${baseUrl}/api/send-confirmation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer_email,
            customer_name,

            service: finalService,

            barber_id: isLegacyBarberBooking
              ? barber
              : null,

            provider_id: isProviderBooking
              ? provider_id
              : null,

            business_id: resolvedBusinessId,

            date,
            time: formattedTime,

            // Send a complete URL to the email template.
            secret_link: `${baseUrl}/customer/${secret_link}`,
            customer_id,

            lang: lang || "es",
            price: finalPrice,
          }),
        })
      );
    }

    // New provider notification
    if (
      isProviderBooking &&
      providerInfo?.email
    ) {
      notificationJobs.push(
        fetch(
          `${baseUrl}/api/send-barber-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              provider_email: providerInfo.email,
              provider_name: providerInfo.name,
              provider_id,

              business_id: resolvedBusinessId,

              customer_name,
              customer_phone: cleanCustomerPhone,
              customer_email: customer_email || null,

              service: finalService,
              date,
              time: formattedTime,
              notes: notes || "",

              dashboard_link:
                `${baseUrl}/business/${resolvedBusinessId}/dashboard`,

              lang: lang || "es",
            }),
          }
        )
      );
    }

    // Legacy barber notification
    if (isLegacyBarberBooking) {
      const { data: barberInfo } = await supabase
        .from("barbers")
        .select("name, email")
        .eq("id", barber)
        .maybeSingle();

      if (barberInfo?.email) {
        notificationJobs.push(
          fetch(
            `${baseUrl}/api/send-barber-notification`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                barber_email: barberInfo.email,
                barber_name: barberInfo.name,
                barber_id: barber,

                customer_name,
                customer_phone: cleanCustomerPhone,
                customer_email,

                service: finalService,
                date,
                time: formattedTime,
                notes: notes || "",

                dashboard_link:
                  `${baseUrl}/barber/${barber}/dashboard`,

                lang: lang || "es",
              }),
            }
          )
        );
      }
    }

    Promise.allSettled(notificationJobs).catch(
      (error) => {
        console.error(
          "Notification processing error:",
          error
        );
      }
    );

    // =========================================================
    // 10. SUCCESS
    // =========================================================

    return json({
      success: true,
      already_created: false,
      secret_link,
      appointment,
    });
  } catch (error) {
    console.error(
      "Unexpected /api/book error:",
      error
    );

    return json(
      {
        success: false,
        code: "SERVER_ERROR",
        error: "Unexpected server error",
      },
      500
    );
  }
}
