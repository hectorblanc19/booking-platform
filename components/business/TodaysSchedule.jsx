"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function TodaysSchedule({
  t,
  lang,
  todaysAppointments,
  isBarberBusiness,
  barberMap,
  providerMap,
}) {
  const router = useRouter();

  const activeAppointments = todaysAppointments.filter(
    (a) => a.status !== "cancelled"
  );

  // DISPLAY TIME IN 12-HOUR FORMAT
  function formatTime(time) {
    if (!time) return "";

    const [hourString, minute] = String(time)
      .slice(0, 5)
      .split(":");

    let hour = Number(hourString);

    const period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;

    return `${hour}:${minute} ${period}`;
  }

  // CURRENT DATE + TIME IN DOMINICAN REPUBLIC
  function getDominicanNow() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santo_Domingo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    const values = {};

    parts.forEach((part) => {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    });

    return {
      date: `${values.year}-${values.month}-${values.day}`,
      hours: Number(values.hour),
      minutes: Number(values.minute),
    };
  }

  // CHECK IF APPOINTMENT TIME HAS PASSED
  function isPastAppointment(appointment) {
    if (!appointment?.date || !appointment?.time) {
      return false;
    }

    const dominicanNow = getDominicanNow();

    if (appointment.date < dominicanNow.date) {
      return true;
    }

    if (appointment.date > dominicanNow.date) {
      return false;
    }

    const [hour, minute] = appointment.time
      .slice(0, 5)
      .split(":")
      .map(Number);

    const appointmentMinutes =
      hour * 60 + minute;

    const currentMinutes =
      dominicanNow.hours * 60 +
      dominicanNow.minutes;

    return appointmentMinutes < currentMinutes;
  }

  // COMPLETED / NO SHOW
  async function updateAppointmentStatus(
    appointmentId,
    newStatus
  ) {
    const label =
      newStatus === "completed"
        ? lang === "es"
          ? "Completado"
          : "Completed"
        : lang === "es"
        ? "No asistió"
        : "No Show";

    const confirmed = window.confirm(
      lang === "es"
        ? `¿Cambiar esta cita a "${label}"?`
        : `Change this appointment to "${label}"?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("appointments")
      .update({
        status: newStatus,
      })
      .eq("id", appointmentId);

    if (error) {
      console.error(
        "Error updating appointment status:",
        error
      );

      alert(
        lang === "es"
          ? "No se pudo actualizar la cita."
          : "Could not update the appointment."
      );

      return;
    }

    // SEND RATING EMAIL ONLY AFTER COMPLETED
    if (newStatus === "completed") {
      try {
        const response = await fetch(
          "/api/send-rating-link",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              appointment_id: appointmentId,
            }),
          }
        );

        if (!response.ok) {
          const data = await response.json();

          console.error(
            "Rating email error:",
            data
          );
        }
      } catch (ratingError) {
        console.error(
          "Could not send rating email:",
          ratingError
        );
      }
    }

    window.location.reload();
  }

  // CANCEL UPCOMING APPOINTMENT
  async function cancelAppointment(appointment) {
    const confirmed = window.confirm(
      lang === "es"
        ? `¿Cancelar la cita de ${appointment.customer_name}?`
        : `Cancel ${appointment.customer_name}'s appointment?`
    );

    if (!confirmed) return;

    // CHECK AGAIN BEFORE CANCELLING
    if (isPastAppointment(appointment)) {
      alert(
        lang === "es"
          ? "Esta cita ya pasó. No se puede cancelar."
          : "This appointment has already passed. It cannot be cancelled."
      );

      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
      })
      .eq("id", appointment.id);

    if (error) {
      console.error(
        "Appointment cancellation error:",
        error
      );

      alert(
        lang === "es"
          ? "No se pudo cancelar la cita."
          : "Could not cancel the appointment."
      );

      return;
    }

    // NOTIFY PROVIDER ABOUT CANCELLATION
    if (appointment.provider_id) {
      try {
        const { data: providerData } =
          await supabase
            .from("providers")
            .select("name, email")
            .eq(
              "id",
              appointment.provider_id
            )
            .maybeSingle();

        if (providerData?.email) {
          const response = await fetch(
            "/api/send-barber-notification",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                provider_email:
                  providerData.email,

                provider_name:
                  providerData.name,

                provider_id:
                  appointment.provider_id,

                customer_name:
                  appointment.customer_name,

                customer_phone:
                  appointment.customer_phone,

                customer_email:
                  appointment.customer_email ||
                  null,

                service:
                  appointment.service,

                date:
                  appointment.date,

                time:
                  appointment.time,

                notes:
                  appointment.notes || null,

                guest_count:
                  appointment.is_group_booking
                    ? appointment.guest_count
                    : null,

                pickup_location:
                  appointment.is_group_booking
                    ? appointment.pickup_location
                    : null,

                is_group_booking:
                  Boolean(
                    appointment.is_group_booking
                  ),

                dashboard_link: null,

                lang:
                  appointment.lang || lang,

                notification_type:
                  "cancelled",
              }),
            }
          );

          if (!response.ok) {
            const data =
              await response.json();

            console.error(
              "Provider cancellation email error:",
              data
            );
          }
        }
      } catch (notificationError) {
        console.error(
          "Provider cancellation notification failed:",
          notificationError
        );
      }
    }

    alert(
      lang === "es"
        ? "Cita cancelada."
        : "Appointment cancelled."
    );

    window.location.reload();
  }

  // OPEN EXISTING RESCHEDULE SYSTEM
  function rescheduleAppointment(appointment) {
    if (isPastAppointment(appointment)) {
      alert(
        lang === "es"
          ? "Esta cita ya pasó. No se puede reprogramar."
          : "This appointment has already passed. It cannot be rescheduled."
      );

      return;
    }

    router.push(
      `/customer/reschedule?secret=${appointment.id}`
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-3">
        {t[lang].todaysSchedule}
      </h2>

      {activeAppointments.length === 0 && (
        <p>{t[lang].noAppointmentsToday}</p>
      )}

      <div className="border rounded-xl p-4 bg-white shadow">
        {activeAppointments.map((a) => {
          const appointmentPassed =
            isPastAppointment(a);

          return (
            <div
              key={a.id}
              className="border-b py-3 last:border-none"
            >
              <p>
                <strong>
                  {formatTime(a.time)}
                </strong>
                {" — "}
                {a.customer_name} ({a.service})
              </p>

              <p>
                {isBarberBusiness
                  ? `Barber: ${
                      barberMap[a.barber_id] ||
                      "Unknown"
                    }`
                  : `Provider: ${
                      providerMap[a.provider_id] ||
                      "Unknown"
                    }`}
              </p>

              {/* STATUS */}
              <p className="mt-1 font-semibold">
                {a.status === "completed" ? (
                  <span className="text-green-600">
                    ✅{" "}
                    {lang === "es"
                      ? "Completado"
                      : "Completed"}
                  </span>
                ) : a.status === "no_show" ? (
                  <span className="text-orange-600">
                    ⚠️{" "}
                    {lang === "es"
                      ? "No asistió"
                      : "No Show"}
                  </span>
                ) : (
                  <span className="text-blue-600">
                    ✔{" "}
                    {lang === "es"
                      ? "Confirmado"
                      : "Confirmed"}
                  </span>
                )}
              </p>

              {/* NEW PROVIDER SYSTEM ONLY */}
              {!isBarberBusiness &&
                a.status === "confirmed" && (
                  <>
                    {/* BEFORE APPOINTMENT */}
                    {!appointmentPassed && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            rescheduleAppointment(a)
                          }
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                        >
                          🔄{" "}
                          {lang === "es"
                            ? "Reprogramar"
                            : "Reschedule"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            cancelAppointment(a)
                          }
                          className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold"
                        >
                          ❌{" "}
                          {lang === "es"
                            ? "Cancelar"
                            : "Cancel"}
                        </button>
                      </div>
                    )}

                    {/* AFTER APPOINTMENT */}
                    {appointmentPassed && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateAppointmentStatus(
                              a.id,
                              "completed"
                            )
                          }
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold"
                        >
                          ✅{" "}
                          {lang === "es"
                            ? "Completado"
                            : "Completed"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateAppointmentStatus(
                              a.id,
                              "no_show"
                            )
                          }
                          className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold"
                        >
                          ⚠️{" "}
                          {lang === "es"
                            ? "No asistió"
                            : "No Show"}
                        </button>
                      </div>
                    )}
                  </>
                )}
            </div>
          );
        })}
      </div>
    </section>
  );
}