"use client";

export default function ManualAppointment({
  t,
  lang,
  isBarberBusiness,

  newAppointmentName,
  setNewAppointmentName,
  newAppointmentPhone,
  setNewAppointmentPhone,
  newAppointmentEmail,
  setNewAppointmentEmail,
  newAppointmentService,
  setNewAppointmentService,
  newAppointmentDate,
  setNewAppointmentDate,
  newAppointmentTime,
  setNewAppointmentTime,

  newAppointmentBarberId,
  setNewAppointmentBarberId,
  newAppointmentProviderId,
  setNewAppointmentProviderId,

  barbers,
  providers,
  services,

  addAppointment,
  savingAppointment,
}) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-3">
        {t[lang].addAppointment}
      </h2>

      <div className="bg-white p-5 rounded-xl shadow border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border p-2 rounded"
            placeholder={t[lang].customerName}
            value={newAppointmentName}
            onChange={(e) => setNewAppointmentName(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder={t[lang].customerPhone}
            value={newAppointmentPhone}
            onChange={(e) => setNewAppointmentPhone(e.target.value)}
          />

          <input
            type="email"
            className="border p-2 rounded"
            placeholder={t[lang].customerEmail}
            value={newAppointmentEmail}
            onChange={(e) => setNewAppointmentEmail(e.target.value)}
          />

          {isBarberBusiness ? (
            <input
              className="border p-2 rounded"
              placeholder={t[lang].service}
              value={newAppointmentService}
              onChange={(e) => setNewAppointmentService(e.target.value)}
            />
          ) : (
            <select
              className="border p-2 rounded"
              value={newAppointmentService}
              onChange={(e) => setNewAppointmentService(e.target.value)}
            >
              <option value="">
                {lang === "es"
                  ? "Selecciona un servicio"
                  : "Select a service"}
              </option>

              {services
                .filter((service) => service.is_active)
                .map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — {service.duration} min
                    {service.price !== null
                      ? ` — RD$${Number(service.price).toLocaleString("en-US")}`
                      : ""}
                  </option>
                ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t[lang].date}
            </label>

            <input
              type="date"
              className="border p-2 rounded w-full"
              value={newAppointmentDate}
              onChange={(e) => setNewAppointmentDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t[lang].time}
            </label>

            <input
              type="time"
              className="border p-2 rounded w-full"
              value={newAppointmentTime}
              onChange={(e) => setNewAppointmentTime(e.target.value)}
            />
          </div>
        </div>

        {isBarberBusiness ? (
          <div>
            <label className="block text-sm font-medium mb-1">
              {t[lang].selectBarber}
            </label>

            <select
              className="border p-2 rounded w-full"
              value={newAppointmentBarberId}
              onChange={(e) => setNewAppointmentBarberId(e.target.value)}
            >
              <option value="">
                {t[lang].noBarber}
              </option>

              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">
              {t[lang].selectProvider}
            </label>

            <select
              className="border p-2 rounded w-full"
              value={newAppointmentProviderId}
              onChange={(e) => setNewAppointmentProviderId(e.target.value)}
            >
              <option value="">
                {lang === "es" ? "Sin profesional" : "No provider"}
              </option>

              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={addAppointment}
          disabled={savingAppointment}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg"
        >
          {savingAppointment
            ? t[lang].checkingAvailability
            : t[lang].saveAppointment}
        </button>
      </div>
    </section>
  );
}