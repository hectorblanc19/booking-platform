"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/* ⭐ ADD THIS BLOCK RIGHT HERE */
const serviceLabels = {
  es: ["Corte", "Barba", "Color", "Niños", "Cejas", "Afeitado", "Diseño", "Blowout", "Shape Up"],
  en: ["Haircut", "Beard", "Color", "Kids", "Eyebrows", "Shave", "Design", "Blowout", "Shape Up"]
};

const dayLabels = {
  es: ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"],
  en: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
};
/* ⭐ END OF BLOCK */

export default function BusinessDashboard() {
  const { businessId } = useParams();

  const [lang, setLang] = useState("en");
  const [business, setBusiness] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberEmail, setNewBarberEmail] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [newBarberPin, setNewBarberPin] = useState("");
  const [newBarberServices, setNewBarberServices] = useState([]);
  const [newBarberDays, setNewBarberDays] = useState([]);

  // TOAST
  const [toast, setToast] = useState(null);
  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  // SECRET KEY ACCESS CONTROL
  const [accessGranted, setAccessGranted] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    const key = url.searchParams.get("key");
    validateKey(key);
  }, []);

  async function validateKey(key) {
    if (!key) {
      setAccessGranted(false);
      setCheckingKey(false);
      return;
    }

    const { data: biz } = await supabase
      .from("businesses")
      .select("secret_key")
      .eq("id", businessId)
      .single();

    if (biz?.secret_key === key) {
      setAccessGranted(true);
      loadDashboard();
    } else {
      setAccessGranted(false);
    }

    setCheckingKey(false);
  }

  /* ⭐ NEW STATE FOR FILTERS + GROUPING + PAGINATION ⭐ */
  const [filterBarberId, setFilterBarberId] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");

  // pagination per barber
  const [pageByBarber, setPageByBarber] = useState({});

  // collapsible sections per barber
  const [openBarbers, setOpenBarbers] = useState({});

  const t = {
    en: {
      dashboard: "Business Dashboard",
      barbers: "Barbers",
      addBarber: "Add Barber",
      barberName: "Barber name",
      barberEmail: "Barber email",
      delete: "Delete",
      todaysSchedule: "Today’s Schedule",
      noAppointmentsToday: "No appointments today.",
      calendarView: "Calendar View",
      customerList: "Customer List",
      allAppointments: "All Appointments",
      appointments: "appointments",
      last: "Last",
      prev: "Previous",
      next: "Next",
      businessInfo: "Business Info",
      bookingLink: "Booking Link",
      copyLink: "Copy Link",
      qrCode: "QR Code",
      copied: "Link copied!",
    },
    es: {
      dashboard: "Panel del Negocio",
      barbers: "Barberos",
      addBarber: "Agregar Barbero",
      barberName: "Nombre del barbero",
      barberEmail: "Correo del barbero",
      delete: "Eliminar",
      todaysSchedule: "Agenda de Hoy",
      noAppointmentsToday: "No hay citas hoy.",
      calendarView: "Vista de Calendario",
      customerList: "Lista de Clientes",
      allAppointments: "Todas las Citas",
      appointments: "citas",
      last: "Última",
      prev: "Anterior",
      next: "Siguiente",
      businessInfo: "Información del Negocio",
      bookingLink: "Enlace de Reserva",
      copyLink: "Copiar Enlace",
      qrCode: "Código QR",
      copied: "¡Enlace copiado!",
    },
  };

  async function loadDashboard() {
    setLoading(true);

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();
    setBusiness(biz || null);

    const { data: bar } = await supabase
      .from("barbers")
      .select("*")
      .eq("business_id", businessId);
    setBarbers(bar || []);

    const { data: appt } = await supabase
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    setAppointments(appt || []);

    const unique = {};
    (appt || []).forEach((a) => {
      if (!unique[a.customer_email]) {
        unique[a.customer_email] = {
          name: a.customer_name,
          email: a.customer_email,
          phone: a.customer_phone,
          last: a.date,
          count: 1,
        };
      } else {
        unique[a.customer_email].count++;
        unique[a.customer_email].last = a.date;
      }
    });

    setCustomers(Object.values(unique));
    setLoading(false);
  }

  async function addBarber() {
  if (!newBarberName || !newBarberEmail || !newBarberPin) {
    showToast("Missing fields");
    return;
  }

  if (newBarberPin.length !== 4) {
    showToast("PIN must be 4 digits");
    return;
  }

  const { error } = await supabase.from("barbers").insert({
  name: newBarberName,
  email: newBarberEmail,
  pin: newBarberPin,
  business_id: businessId,
  services: newBarberServices,     // ← FIX
  working_days: newBarberDays,     // ← FIX (your column is working_days, not work_days)
});

  if (error) {
    showToast("Error adding barber");
    return;
  }

  setNewBarberName("");
  setNewBarberEmail("");
  setNewBarberPin("");

  loadDashboard();
  showToast("Barber added");
}

  async function deleteBarber(id) {
    if (!confirm("Delete this barber?")) return;

    await supabase.from("barbers").delete().eq("id", id);
    loadDashboard();
    showToast("Barber deleted");
  }

  const barberMap = Object.fromEntries(
    barbers.map((b) => [b.id, b.name])
  );

  const today = new Date().toISOString().split("T")[0];
  const todaysAppointments = appointments.filter((a) => a.date === today);

  function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  async function loadAppointmentsForDate(dateStr) {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .eq("date", dateStr)
      .order("time", { ascending: true });

    setSelectedAppointments(data || []);
  }

  function changeMonth(offset) {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setSelectedMonth(newMonth);
    setSelectedDate(null);
    setSelectedAppointments([]);
  }
/* ⭐ FILTER + GROUP + PAGINATION LOGIC ⭐ */

const APPOINTMENTS_PER_PAGE = 20;

// FILTER APPOINTMENTS
const filteredAppointments = appointments.filter((a) => {
  // filter by barber
  if (filterBarberId !== "all" && a.barber_id !== filterBarberId) return false;

  // filter by exact date
  if (filterDate && a.date !== filterDate) return false;

  // filter by month (YYYY-MM)
  if (filterMonth !== "all") {
    const monthStr = a.date.slice(0, 7); // "YYYY-MM"
    if (monthStr !== filterMonth) return false;
  }

  return true;
});

// GROUP BY BARBER
const groupedByBarber = {};
filteredAppointments.forEach((a) => {
  if (!groupedByBarber[a.barber_id]) {
    groupedByBarber[a.barber_id] = [];
  }
  groupedByBarber[a.barber_id].push(a);
});

// COLLAPSE TOGGLE
const toggleBarberOpen = (barberId) => {
  setOpenBarbers((prev) => ({
    ...prev,
    [barberId]: !prev[barberId],
  }));
};

// PAGINATION PER BARBER
const changeBarberPage = (barberId, newPage) => {
  setPageByBarber((prev) => ({
    ...prev,
    [barberId]: newPage,
  }));
};


  if (checkingKey) {
    return <p className="p-6 text-center">Checking access…</p>;
  }

  if (!accessGranted) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h1>
        <p className="text-gray-600">
          Invalid or missing access key.
        </p>
      </div>
    );
  }

  if (loading) return <p className="p-6">Loading...</p>;
  return (
    <div className="max-w-5xl mx-auto p-6">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-4 right-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* LANGUAGE TOGGLE */}
      <div className="flex justify-end mb-4 text-sm font-semibold cursor-pointer">
        <span
          className={lang === "es" ? "text-blue-600" : "text-gray-500"}
          onClick={() => setLang("es")}
        >
          ES
        </span>
        <span className="mx-2">|</span>
        <span
          className={lang === "en" ? "text-blue-600" : "text-gray-500"}
          onClick={() => setLang("en")}
        >
          EN
        </span>
      </div>

      <h1 className="text-3xl font-bold mb-6">
        {business?.name} — {t[lang].dashboard}
      </h1>

     {/* BUSINESS INFO */}
<section className="mb-12">
  <h2 className="text-2xl font-semibold mb-3">{t[lang].businessInfo}</h2>

  <div className="bg-white p-4 rounded-xl shadow space-y-3 border">
    <p><strong>Name:</strong> {business?.name}</p>
    <p><strong>Phone:</strong> {business?.phone}</p>
    <p><strong>Address:</strong> {business?.address}</p>
  </div>
</section>

{/* ⭐ BUSINESS QR CODE — PASTE HERE */}
<section className="mb-12">
  <h2 className="text-2xl font-semibold mb-3">{t[lang].qrCode}</h2>

  <div className="bg-white p-4 rounded-xl shadow inline-block">
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        `https://www.flowpaydr.com/select-barber/${businessId}`
      )}`}
      alt="Business QR Code"
      className="w-40 h-40 mx-auto mb-3"
    />

    <p className="text-gray-600 mb-2 text-center">
      {lang === "es"
        ? "Comparte este QR para que los clientes elijan un barbero."
        : "Share this QR so clients can select a barber."}
    </p>

    <p className="text-gray-400 text-xs mb-3 text-center">
      {lang === "es"
        ? "Mantén presionada la imagen 3 segundos para copiar, guardar o compartir."
        : "Hold the image for 3 seconds to copy, save, or share."}
    </p>

    <button
      onClick={() => {
        const link = document.createElement("a");
        link.href = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
          `https://www.flowpaydr.com/select-barber/${businessId}`
        )}`;
        link.download = `business-${businessId}-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }}
      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm mx-auto block"
    >
      {lang === "es" ? "Descargar QR" : "Download QR"}
    </button>
  </div>
</section>

{/* BARBERS */}
<section className="mb-12">
  <h2 className="text-2xl font-semibold mb-3">{t[lang].barbers}</h2>

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
      <label key={service} className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={newBarberServices.includes(service)}
          onChange={(e) => {
            if (e.target.checked) {
              setNewBarberServices([...newBarberServices, service]);
            } else {
              setNewBarberServices(
                newBarberServices.filter((s) => s !== service)
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
    {lang === "es" ? "Días Laborales" : "Work Days"}
  </label>

  <div className="grid grid-cols-4 gap-2 text-sm">
    {dayLabels[lang].map((day) => (
      <label key={day} className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={newBarberDays.includes(day)}
          onChange={(e) => {
            if (e.target.checked) {
              setNewBarberDays([...newBarberDays, day]);
            } else {
              setNewBarberDays(
                newBarberDays.filter((d) => d !== day)
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
      const barberLink = `https://www.flowpaydr.com/booking/${b.id}`;

      return (
        <div key={b.id} className="border-b pb-4 last:border-none">
          <div className="flex justify-between items-center">
            <span className="font-semibold">{b.name} — {b.email}</span>

            <button
              className="text-red-600"
              onClick={() => deleteBarber(b.id)}
            >
              {t[lang].delete}
            </button>
          </div>

          {/* BOOKING LINK */}
          <div className="mt-3">
            <p className="text-sm font-medium">{t[lang].bookingLink}:</p>
            <p className="text-blue-600 text-sm break-all">{barberLink}</p>

            <button
              className="mt-1 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 active:scale-95 transition"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(barberLink);
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
            <p className="text-sm font-medium">{t[lang].qrCode}:</p>
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

      {/* TODAY'S SCHEDULE */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">{t[lang].todaysSchedule}</h2>

        {todaysAppointments.length === 0 && (
          <p>{t[lang].noAppointmentsToday}</p>
        )}

        <div className="border rounded-xl p-4 bg-white shadow">
          {todaysAppointments.map((a) => (
            <div key={a.id} className="border-b py-3 last:border-none">
              <p>
                <strong>{a.time}</strong> — {a.customer_name} ({a.service})
              </p>
              <p>Barber: {barberMap[a.barber_id] || "Unknown"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CALENDAR */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">{t[lang].calendarView}</h2>

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
              (a) => a.date === dateStr
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
                  <p className="text-xs text-green-700 font-semibold">
                    {count} {t[lang].appointments}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-6 border rounded-xl p-4 bg-white shadow">
            <h3 className="text-xl font-semibold mb-3">
              Appointments for {selectedDate}
            </h3>

            {selectedAppointments.length === 0 && (
              <p>No appointments for this day.</p>
            )}

            {selectedAppointments.map((a) => (
              <div key={a.id} className="border-b py-3 last:border-none">
                <p>
                  <strong>{a.time}</strong> — {a.customer_name} ({a.service})
                </p>
                <p>Barber: {barberMap[a.barber_id] || "Unknown"}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CUSTOMERS */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">{t[lang].customerList}</h2>

        <div className="border rounded-xl p-4 bg-white shadow">
          {customers.map((c, i) => (
            <div key={i} className="border-b py-3 last:border-none">
              <p><strong>{c.name}</strong></p>
              <p>{c.email} — {c.phone}</p>
              <p>
                {c.count} {t[lang].appointments} — {t[lang].last}: {c.last}
              </p>
            </div>
          ))}
        </div>
      </section>

     {/* ALL APPOINTMENTS */}
<section className="mb-12">
  <h2 className="text-2xl font-semibold mb-3">{t[lang].allAppointments}</h2>

  {/* FILTER BAR */}
  <div className="mb-4 flex flex-wrap gap-3 items-center">

    {/* Barber Filter */}
    <div>
      <label className="block text-sm font-medium mb-1">
        {lang === "es" ? "Barbero" : "Barber"}
      </label>
      <select
        className="border rounded px-2 py-1 text-sm"
        value={filterBarberId}
        onChange={(e) => setFilterBarberId(e.target.value)}
      >
        <option value="all">{lang === "es" ? "Todos" : "All"}</option>
        {Object.entries(barberMap).map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
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
        onChange={(e) => setFilterDate(e.target.value)}
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
        onChange={(e) => setFilterMonth(e.target.value)}
      >
        <option value="all">{lang === "es" ? "Todos" : "All"}</option>
        {Array.from(new Set(appointments.map(a => a.date.slice(0, 7))))
          .sort()
          .map(monthStr => (
            <option key={monthStr} value={monthStr}>{monthStr}</option>
          ))}
      </select>
    </div>
  </div>

  {/* GROUPED + PAGINATED BY BARBER */}
  <div className="border rounded-xl p-4 bg-white shadow space-y-4">
    {Object.entries(groupedByBarber).length === 0 && (
      <p className="text-sm text-gray-500">
        {lang === "es" ? "No hay citas con estos filtros." : "No appointments with these filters."}
      </p>
    )}

    {Object.entries(groupedByBarber).map(([barberId, list]) => {
      const barberName = barberMap[barberId] || "Unknown";
      const total = list.length;
      const currentPage = pageByBarber[barberId] || 0;
      const totalPages = Math.max(1, Math.ceil(total / APPOINTMENTS_PER_PAGE));

      const start = currentPage * APPOINTMENTS_PER_PAGE;
      const end = start + APPOINTMENTS_PER_PAGE;
      const pageItems = list.slice(start, end);

      const isOpen = openBarbers[barberId] ?? true;

      return (
        <div key={barberId} className="border rounded-lg p-3 bg-gray-50 space-y-2">

          {/* HEADER */}
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleBarberOpen(barberId)}
          >
            <div>
              <p className="font-semibold">
                {lang === "es" ? "Barbero: " : "Barber: "}
                {barberName}
              </p>
              <p className="text-xs text-gray-500">
                {total} {lang === "es" ? "citas" : "appointments"}
              </p>
            </div>

            <span className="text-sm text-blue-600">
              {isOpen ? (lang === "es" ? "Cerrar" : "Collapse") : (lang === "es" ? "Abrir" : "Expand")}
            </span>
          </div>

          {/* BODY */}
          {isOpen && (
            <div className="space-y-2 mt-2">

              {/* APPOINTMENTS */}
              {pageItems.map((a) => (
                <div key={a.id} className="border-b py-2 last:border-none text-sm">
                  <p><strong>{a.date}</strong> — <strong>{a.time}</strong></p>
                  <p>{a.customer_name} — {a.service}</p>
                </div>
              ))}

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-2 text-xs">
                  <button
                    className="px-2 py-1 border rounded disabled:opacity-40"
                    disabled={currentPage === 0}
                    onClick={() => changeBarberPage(barberId, currentPage - 1)}
                  >
                    {lang === "es" ? "Anterior" : "Prev"}
                  </button>

                  <span>
                    {lang === "es" ? "Página" : "Page"} {currentPage + 1} / {totalPages}
                  </span>

                  <button
                    className="px-2 py-1 border rounded disabled:opacity-40"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => changeBarberPage(barberId, currentPage + 1)}
                  >
                    {lang === "es" ? "Siguiente" : "Next"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    })}
  </div>
</section>

      {/* ANIMATION */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>

    </div>
  );
}

