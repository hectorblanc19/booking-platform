"use client";

import { supabase } from "@/lib/supabaseClient";

function formatTime12(time) {
  if (!time) return "";

  const [hourString, minute] = time.split(":");
  let hour = Number(hourString);

  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

export default function AllAppointments({
  t,
  lang,
  isBarberBusiness,
  filterBarberId,
  setFilterBarberId,
  filterDate,
  setFilterDate,
  filterMonth,
  setFilterMonth,
  appointments,
  barberMap,
  providerMap,
  groupedByBarber,
  pageByBarber,
  openBarbers,
  APPOINTMENTS_PER_PAGE,
  toggleBarberOpen,
  changeBarberPage,
}) {
  

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

    // ⭐ SEND REVIEW EMAIL ONLY AFTER COMPLETED
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

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-3">
        {t[lang].allAppointments}
      </h2>

      {/* FILTER BAR */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">

        {/* Barber / Provider Filter */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {isBarberBusiness
              ? lang === "es"
                ? "Barbero"
                : "Barber"
              : lang === "es"
              ? "Profesional"
              : "Provider"}
          </label>

          <select
            className="border rounded px-2 py-1 text-sm"
            value={filterBarberId}
            onChange={(e) =>
              setFilterBarberId(e.target.value)
            }
          >
            <option value="all">
              {lang === "es" ? "Todos" : "All"}
            </option>

            {Object.entries(
              isBarberBusiness
                ? barberMap
                : providerMap
            ).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {lang === "es" ? "Fecha" : "Date"}
          </label>

          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={filterDate}
            onChange={(e) =>
              setFilterDate(e.target.value)
            }
          />
        </div>

        {/* Month Filter */}
        <div>
          <label className="block text-sm font-medium mb-1">
            {lang === "es" ? "Mes" : "Month"}
          </label>

          <select
            className="border rounded px-2 py-1 text-sm"
            value={filterMonth}
            onChange={(e) =>
              setFilterMonth(e.target.value)
            }
          >
            <option value="all">
              {lang === "es" ? "Todos" : "All"}
            </option>

            {Array.from(
              new Set(
                appointments.map((a) =>
                  a.date.slice(0, 7)
                )
              )
            )
              .sort()
              .map((monthStr) => (
                <option
                  key={monthStr}
                  value={monthStr}
                >
                  {monthStr}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* GROUPED + PAGINATED BY BARBER / PROVIDER */}
      <div className="border rounded-xl p-4 bg-white shadow space-y-4">
        {Object.entries(groupedByBarber).length ===
          0 && (
          <p className="text-sm text-gray-500">
            {lang === "es"
              ? "No hay citas con estos filtros."
              : "No appointments with these filters."}
          </p>
        )}

        {Object.entries(groupedByBarber).map(
          ([barberId, list]) => {
            const personName = isBarberBusiness
              ? barberMap[barberId] || "Unknown"
              : providerMap[barberId] || "Unknown";

            const total = list.length;

            const currentPage =
              pageByBarber[barberId] || 0;

            const totalPages = Math.max(
              1,
              Math.ceil(
                total / APPOINTMENTS_PER_PAGE
              )
            );

            const start =
              currentPage *
              APPOINTMENTS_PER_PAGE;

            const end =
              start + APPOINTMENTS_PER_PAGE;

            const pageItems = list.slice(
              start,
              end
            );

            const isOpen =
              openBarbers[barberId] ?? true;

            return (
              <div
                key={barberId}
                className="border rounded-lg p-3 bg-gray-50 space-y-2"
              >
                {/* HEADER */}
                <div
                  className="flex justify-between items-center cursor-pointer"
                  onClick={() =>
                    toggleBarberOpen(barberId)
                  }
                >
                  <div>
                    <p className="font-semibold">
                      {isBarberBusiness
                        ? lang === "es"
                          ? "Barbero: "
                          : "Barber: "
                        : lang === "es"
                        ? "Profesional: "
                        : "Provider: "}
                      {personName}
                    </p>

                    <p className="text-xs text-gray-500">
                      {total}{" "}
                      {lang === "es"
                        ? "citas"
                        : "appointments"}
                    </p>
                  </div>

                  <span className="text-sm text-blue-600">
                    {isOpen
                      ? lang === "es"
                        ? "Cerrar"
                        : "Collapse"
                      : lang === "es"
                      ? "Abrir"
                      : "Expand"}
                  </span>
                </div>

                {/* BODY */}
                {isOpen && (
                  <div className="space-y-2 mt-2">

                    {/* APPOINTMENTS */}
                    {pageItems.map((a) => (
                      <div
                        key={a.id}
                        className="border-b py-2 last:border-none text-sm"
                      >
                        <p>
                          <strong>{a.date}</strong>{" "}
                          —{" "}
                          <strong>
                            {formatTime12(a.time)}
                          </strong>
                        </p>

                        <p>
                          {a.customer_name} —{" "}
                          {a.service}
                        </p>

                        <p className="mt-1 font-semibold">
                          {a.status ===
                          "cancelled" ? (
                            <span className="text-red-600">
                              ❌{" "}
                              {lang === "es"
                                ? "Cancelado"
                                : "Cancelled"}
                            </span>
                          ) : a.status ===
                            "completed" ? (
                            <span className="text-green-600">
                              ✅{" "}
                              {lang === "es"
                                ? "Completado"
                                : "Completed"}
                            </span>
                          ) : a.status ===
                            "no_show" ? (
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

                        {/* GENERIC PROVIDER STATUS ACTIONS */}
                        {!isBarberBusiness &&
                          a.status ===
                            "confirmed" &&
                          isPastAppointment(a) && (
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
                      </div>
                    ))}

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-end gap-2 mt-2 text-xs">
                        <button
                          className="px-2 py-1 border rounded disabled:opacity-40"
                          disabled={
                            currentPage === 0
                          }
                          onClick={() =>
                            changeBarberPage(
                              barberId,
                              currentPage - 1
                            )
                          }
                        >
                          {lang === "es"
                            ? "Anterior"
                            : "Prev"}
                        </button>

                        <span>
                          {lang === "es"
                            ? "Página"
                            : "Page"}{" "}
                          {currentPage + 1} /{" "}
                          {totalPages}
                        </span>

                        <button
                          className="px-2 py-1 border rounded disabled:opacity-40"
                          disabled={
                            currentPage >=
                            totalPages - 1
                          }
                          onClick={() =>
                            changeBarberPage(
                              barberId,
                              currentPage + 1
                            )
                          }
                        >
                          {lang === "es"
                            ? "Siguiente"
                            : "Next"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}