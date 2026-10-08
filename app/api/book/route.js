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
      return json({
        success: true,
        already_created: true,
        secret_link: priorAppointment.secret_link,
        appointment: priorAppointment,
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

    // =========================================================
    // 4. NEW BUSINESS / PROVIDER BOOKING
    // =========================================================

    if (isProviderBooking) {
      // Verify business exists
      const {
        data: businessInfo,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("id", resolvedBusinessId)
        .maybeSingle();

      if (businessError || !businessInfo) {
        console.error(
          "Business lookup failed:",
          businessError
        );

        return json(
          {
            success: false,
            code: "BUSINESS_NOT_FOUND",
            error: "Business not found",
          },
          404
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
        console.error(
          "Provider lookup failed:",
          providerError
        );

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

  // Verify service belongs to business and is available
// either for this provider specifically or for all providers.
const {
  data: serviceInfo,
  error: serviceError,
} = await supabase
  .from("business_services")
  .select(
    "id, business_id, provider_id, name, price, duration, is_active"
  )
  .eq("id", service_id)
  .eq("business_id", resolvedBusinessId)
  .or(`provider_id.eq.${provider_id},provider_id.is.null`)
  .eq("is_active", true)
  .maybeSingle();

      if (serviceError || !serviceInfo) {
        console.error(
          "Service lookup failed:",
          serviceError
        );

        return json(
          {
            success: false,
            code: "SERVICE_NOT_FOUND",
            error: "Service not found or unavailable",
          },
          404
        );
      }

      // Trust database values instead of browser values.
      finalService = serviceInfo.name;

      finalDuration =
        Number(serviceInfo.duration) > 0
          ? Number(serviceInfo.duration)
          : finalDuration;

      finalPrice =
        serviceInfo.price !== null &&
        serviceInfo.price !== undefined
          ? Number(serviceInfo.price)
          : finalPrice;

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
          service_id,

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
          return json({
            success: true,
            already_created: true,
            secret_link: sameRequest.secret_link,
            appointment: sameRequest,
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