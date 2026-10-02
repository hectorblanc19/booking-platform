import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(body, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      business,
      barber,
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

    if (
      !barber ||
      !service ||
      !date ||
      !time ||
      !customer_name ||
      !customer_email ||
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

    const cleanCustomerPhone = String(customer_phone).replace(/\D/g, "");

    const selectedDuration =
      Number(duration) > 0 ? Number(duration) : 60;

    const formattedTime =
      String(time).length === 5 ? `${time}:00` : String(time);

    // =========================================================
    // 1. IDEMPOTENCY CHECK
    // =========================================================
    // If this exact booking request already created an
    // appointment, return that appointment instead of treating
    // its own time as unavailable.
    // =========================================================

    const {
      data: priorAppointment,
      error: priorError,
    } = await supabase
      .from("appointments")
      .select("*")
      .eq("booking_request_id", booking_request_id)
      .maybeSingle();

    if (priorError) {
      console.error("Idempotency lookup failed:", priorError);

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
    // 2. CHECK BARBER AVAILABILITY USING DURATION OVERLAP
    // =========================================================

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
      console.error("Availability lookup failed:", existingError);

      return json(
        {
          success: false,
          code: "DATABASE_ERROR",
          error: "Could not check availability",
        },
        500
      );
    }

    const newStart = new Date(`${date}T${formattedTime}`);

    const newEnd = new Date(
      newStart.getTime() +
        selectedDuration * 60 * 1000
    );

    for (const appt of existingAppointments || []) {
      const existingStart = new Date(
        `${appt.date}T${appt.time}`
      );

      const existingDuration =
        Number(appt.duration) > 0
          ? Number(appt.duration)
          : 60;

      const existingEnd = new Date(
        existingStart.getTime() +
          existingDuration * 60 * 1000
      );

      if (
        existingStart < newEnd &&
        existingEnd > newStart
      ) {
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
    // 3. CREATE APPOINTMENT
    // =========================================================

    const secret_link = crypto.randomUUID();
    const customer_id = secret_link;

    const {
      data: appointment,
      error: insertError,
    } = await supabase
      .from("appointments")
      .insert({
        business_id: business || null,
        barber_id: barber,
        service,
        date,
        time: formattedTime,
        duration: selectedDuration,
        customer_name,
        customer_email,
        customer_phone: cleanCustomerPhone,
        notes: notes || "",
        customer_id,
        status: "confirmed",
        secret_link,
        lang: lang || "es",
        price: price ?? 0,
        booking_request_id,
      })
      .select()
      .single();

    // =========================================================
    // 4. DATABASE CONCURRENCY PROTECTION
    // =========================================================

    if (insertError) {
      if (insertError.code === "23505") {
        // Another copy of THIS SAME request may have
        // successfully created the appointment first.
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

        // Otherwise a genuinely different booking took
        // the requested time.
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
        "Supabase insert error:",
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
    // 5. NOTIFICATIONS
    // =========================================================
    // The appointment is already safely stored.
    // Notification failures must NOT make the customer think
    // the booking failed.
    // =========================================================

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://www.flowpaydr.com";

    Promise.allSettled([
      fetch(`${baseUrl}/api/send-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_email,
          customer_name,
          service,
          barber_id: barber,
          business_id: business || null,
          date,
          time: formattedTime,
          secret_link,
          lang: lang || "es",
          customer_id,
          price: price ?? 0,
        }),
      }),

      (async () => {
        const { data: barberInfo } =
          await supabase
            .from("barbers")
            .select("name, email")
            .eq("id", barber)
            .maybeSingle();

        if (!barberInfo?.email) {
          return null;
        }

        return fetch(
          `${baseUrl}/api/send-barber-notification`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              barber_email: barberInfo.email,
              barber_name: barberInfo.name,
              barber_id: barber,

              customer_name,
              customer_phone:
                cleanCustomerPhone,
              customer_email,

              service,
              date,
              time: formattedTime,
              notes: notes || "",

              dashboard_link:
                `${baseUrl}/barber/${barber}/dashboard`,

              lang: lang || "es",
            }),
          }
        );
      })(),
    ]).catch((error) => {
      console.error(
        "Notification processing error:",
        error
      );
    });

    // =========================================================
    // 6. SUCCESS
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