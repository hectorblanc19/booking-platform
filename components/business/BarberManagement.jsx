"use client";

export default function BarberManagement({
  t,
  lang,
  newBarberName,
  setNewBarberName,
  newBarberEmail,
  setNewBarberEmail,
  newBarberPin,
  setNewBarberPin,
  newBarberServices,
  setNewBarberServices,
  newBarberDays,
  setNewBarberDays,
  serviceLabels,
  dayLabels,
  addBarber,
  barbers,
  deleteBarber,
  showToast,
}) {
  return (
    <>
      {/* BARBERS */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          {t[lang].barbers}
        </h2>

        {/* ADD BARBER */}
        <div className="space-y-4 bg-white p-4 rounded-xl shadow">

          {/* BASIC INFO */}
          <div className="grid grid-cols-3 gap-2">
            <input
              className="border p-2 rounded"
              placeholder={t[lang].barberName}
              value={newBarberName}
              onChange={(e) => setNewBarberName(e.target.value)}
            />

            <input
              className="border p-2 rounded"
              placeholder={t[lang].barberEmail}
              value={newBarberEmail}
              onChange={(e) => setNewBarberEmail(e.target.value)}
            />

            <input
              className="border p-2 rounded"
              placeholder="PIN (4 digits)"
              value={newBarberPin}
              onChange={(e) => setNewBarberPin(e.target.value)}
              maxLength={4}
            />
          </div>

          {/* SERVICES */}
          <div>
            <label className="block font-semibold mb-2">
              {lang === "es" ? "Servicios" : "Services"}
            </label>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {serviceLabels[lang].map((service) => (
                <label
                  key={service}
                  className="flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={newBarberServices.includes(service)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewBarberServices([
                          ...newBarberServices,
                          service,
                        ]);
                      } else {
                        setNewBarberServices(
                          newBarberServices.filter(
                            (s) => s !== service
                          )
                        );
                      }
                    }}
                  />
                  {service}
                </label>
              ))}
            </div>
          </div>

          {/* WORK DAYS */}
          <div>
            <label className="block font-semibold mb-2">
              {lang === "es"
                ? "Días Laborales"
                : "Work Days"}
            </label>

            <div className="grid grid-cols-4 gap-2 text-sm">
              {dayLabels[lang].map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={newBarberDays.includes(day)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewBarberDays([
                          ...newBarberDays,
                          day,
                        ]);
                      } else {
                        setNewBarberDays(
                          newBarberDays.filter(
                            (d) => d !== day
                          )
                        );
                      }
                    }}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>

          {/* ADD BUTTON */}
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mb-2"
            onClick={addBarber}
          >
            {t[lang].addBarber}
          </button>
        </div>
      </section>

      {/* BARBER LIST */}
      <section className="mb-12">
        <div className="border rounded-xl p-4 bg-white shadow space-y-6">
          {barbers.map((b) => {
            const barberLink =
              `https://www.flowpaydr.com/booking/${b.id}`;

            return (
              <div
                key={b.id}
                className="border-b pb-4 last:border-none"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    {b.name} — {b.email}
                  </span>

                  <button
                    className="text-red-600"
                    onClick={() => deleteBarber(b.id)}
                  >
                    {t[lang].delete}
                  </button>
                </div>

                {/* BOOKING LINK */}
                <div className="mt-3">
                  <p className="text-sm font-medium">
                    {t[lang].bookingLink}:
                  </p>

                  <p className="text-blue-600 text-sm break-all">
                    {barberLink}
                  </p>

                  <button
                    className="mt-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 active:scale-95 transition"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          barberLink
                        );
                        showToast(t[lang].copied);
                      } catch (err) {
                        showToast("Copy failed");
                      }
                    }}
                  >
                    {t[lang].copyLink}
                  </button>
                </div>

                {/* QR CODE */}
                <div className="mt-3">
                  <p className="text-sm font-medium">
                    {t[lang].qrCode}:
                  </p>

                  <div className="inline-block bg-white p-3 rounded-xl shadow">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        barberLink
                      )}`}
                      alt="QR Code"
                      className="w-32 h-32"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}