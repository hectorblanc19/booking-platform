"use client";

export default function TodaysSchedule({
  t,
  lang,
  todaysAppointments,
  isBarberBusiness,
  barberMap,
  providerMap,
}) {
  const activeAppointments = todaysAppointments.filter(
    (a) => a.status !== "cancelled"
  );

  // DISPLAY TIME IN 12-HOUR FORMAT
  function formatTime(time) {
    if (!time) return "";

    const [hourString, minute] = String(time).slice(0, 5).split(":");
    let hour = Number(hourString);

    const period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;

    return `${hour}:${minute} ${period}`;
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
        {activeAppointments.map((a) => (
          <div key={a.id} className="border-b py-3 last:border-none">
            <p>
              <strong>{formatTime(a.time)}</strong> — {a.customer_name} ({a.service})
            </p>

            <p>
              {isBarberBusiness
                ? `Barber: ${barberMap[a.barber_id] || "Unknown"}`
                : `Provider: ${providerMap[a.provider_id] || "Unknown"}`}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}