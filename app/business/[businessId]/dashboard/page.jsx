"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
    },
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    // Business
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();
    setBusiness(biz || null);

    // Barbers for this business
    const { data: bar } = await supabase
      .from("barbers")
      .select("*")
      .eq("business_id", businessId);
    setBarbers(bar || []);

    // Appointments for this business (no joins)
    const { data: appt } = await supabase
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    setAppointments(appt || []);

    // Build customer list
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
    if (!newBarberName || !newBarberEmail) {
      alert("Fill all fields");
      return;
    }

    const { error } = await supabase.from("barbers").insert({
      name: newBarberName,
      email: newBarberEmail,
      business_id: businessId,
    });

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    setNewBarberName("");
    setNewBarberEmail("");
    loadDashboard();
  }

  async function deleteBarber(id) {
    if (!confirm("Delete this barber?")) return;

    await supabase.from("barbers").delete().eq("id", id);
    loadDashboard();
  }

  // Map barber_id → barber name
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

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
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

      {/* BARBERS */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">{t[lang].barbers}</h2>

        <div className="grid grid-cols-2 gap-2 mb-4">
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
        </div>

        <button
          className="bg-green-600 text-white px-4 py-2 rounded mb-4"
          onClick={addBarber}
        >
          {t[lang].addBarber}
        </button>

        <div className="border rounded-xl p-4 bg-white shadow">
          {barbers.map((b) => (
            <div
              key={b.id}
              className="flex justify-between border-b py-2 last:border-none"
            >
              <span>{b.name} — {b.email}</span>
              <button
                className="text-red-600"
                onClick={() => deleteBarber(b.id)}
              >
                {t[lang].delete}
              </button>
            </div>
          ))}
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

      {/* CALENDAR VIEW */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">{t[lang].calendarView}</h2>

        {/* MONTH NAVIGATION */}
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

        {/* CALENDAR GRID */}
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

        {/* SELECTED DAY APPOINTMENTS */}
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

      {/* CUSTOMER LIST */}
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
      <section>
        <h2 className="text-2xl font-semibold mb-3">{t[lang].allAppointments}</h2>

        <div className="border rounded-xl p-4 bg-white shadow">
          {appointments.map((a) => (
            <div key={a.id} className="border-b py-3 last:border-none">
              <p>
                <strong>{a.date}</strong> — <strong>{a.time}</strong>
              </p>
              <p>{a.customer_name} — {a.service}</p>
              <p>Barber: {barberMap[a.barber_id] || "Unknown"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
