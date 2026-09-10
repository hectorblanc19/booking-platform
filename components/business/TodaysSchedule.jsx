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
              <strong>{a.time}</strong> — {a.customer_name} ({a.service})
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