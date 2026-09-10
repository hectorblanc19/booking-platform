"use client";

function formatTime12(time) {
  if (!time) return "";

  const [hourString, minute] = time.split(":");
  let hour = Number(hourString);

  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

export default function CalendarView({
  t,
  lang,
  selectedMonth,
  selectedDate,
  selectedAppointments,
  appointments,
  isBarberBusiness,
  barberMap,
  providerMap,
  getDaysInMonth,
  changeMonth,
  setSelectedDate,
  loadAppointmentsForDate,
}) {
  const activeSelectedAppointments = selectedAppointments.filter(
    (a) => a.status !== "cancelled"
  );

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-3">
        {t[lang].calendarView}
      </h2>

      <div className="flex justify-between mb-4">
        <button
          className="px-3 py-1 bg-gray-200 rounded"
          onClick={() => changeMonth(-1)}
        >
          ← {t[lang].prev}
        </button>

        <h3 className="text-xl font-bold">
          {selectedMonth.toLocaleString(
            lang === "en" ? "en-US" : "es-DO",
            { month: "long", year: "numeric" }
          )}
        </h3>

        <button
          className="px-3 py-1 bg-gray-200 rounded"
          onClick={() => changeMonth(1)}
        >
          {t[lang].next} →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => {
          const day = i + 1;
          const month = selectedMonth.getMonth() + 1;
          const year = selectedMonth.getFullYear();

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;

          const count = appointments.filter(
            (a) => a.date === dateStr && a.status !== "cancelled"
          ).length;

          return (
            <div
              key={day}
              className={`
                p-3 border rounded-xl shadow cursor-pointer transition
                ${selectedDate === dateStr ? "bg-blue-200 border-blue-600" : ""}
                ${count > 0 ? "bg-green-100 border-green-500" : "bg-white"}
              `}
              onClick={() => {
                setSelectedDate(dateStr);
                loadAppointmentsForDate(dateStr);
              }}
            >
              <strong>{day}</strong>

              {count > 0 && (
                <p className="text-[10px] sm:text-xs text-green-700 font-semibold leading-tight">
                  <span className="sm:hidden">{count}</span>

                  <span className="hidden sm:inline">
                    {count} {t[lang].appointments}
                  </span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="mt-6 border rounded-xl p-4 bg-white shadow">
          <h3 className="text-xl font-semibold mb-3">
            {lang === "es"
              ? `Citas para ${selectedDate}`
              : `Appointments for ${selectedDate}`}
          </h3>

          {activeSelectedAppointments.length === 0 && (
            <p>
              {lang === "es"
                ? "No hay citas activas para este día."
                : "No active appointments for this day."}
            </p>
          )}

          {activeSelectedAppointments.map((a) => (
            <div key={a.id} className="border-b py-3 last:border-none">
              <p>
                <strong>{formatTime12(a.time)}</strong> —{" "}
                {a.customer_name} ({a.service})
              </p>

              <p>
                {isBarberBusiness
                  ? `${
                      lang === "es" ? "Barbero" : "Barber"
                    }: ${barberMap[a.barber_id] || "Unknown"}`
                  : `${
                      lang === "es" ? "Profesional" : "Provider"
                    }: ${providerMap[a.provider_id] || "Unknown"}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}