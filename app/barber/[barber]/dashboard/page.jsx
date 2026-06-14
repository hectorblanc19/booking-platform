"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BlockingPanel from "@/components/BlockingPanel";

// Bilingual dictionary
const t = {
  es: {
    title: "Panel del Barbero",
    barber: "Barbero",
    today: "Hoy",
    tomorrow: "Mañana",
    week: "Próximos 7 Días",
    loading: "Cargando citas...",
    none: "No se encontraron citas.",
    date: "Fecha",
    time: "Hora",
    service: "Servicio",
    customer: "Cliente",
    phone: "Teléfono",
    email: "Correo",
    notes: "Notas",
    noNotes: "Ninguna",
    cancel: "Cancelar Cita",
    reschedule: "Reprogramar",
    langLabel: "Idioma",
    es: "ES",
    en: "EN",
  },
  en: {
    title: "Barber Dashboard",
    barber: "Barber",
    today: "Today",
    tomorrow: "Tomorrow",
    week: "Next 7 Days",
    loading: "Loading appointments...",
    none: "No appointments found.",
    date: "Date",
    time: "Time",
    service: "Service",
    customer: "Customer",
    phone: "Phone",
    email: "Email",
    notes: "Notes",
    noNotes: "None",
    cancel: "Cancel Appointment",
    reschedule: "Reschedule",
    langLabel: "Language",
    es: "ES",
    en: "EN",
  },
};

export default function BarberDashboard() {
  const { barber } = useParams();

  const [appointments, setAppointments] = useState([]);
  const [view, setView] = useState("today");
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("es");

  const tr = t[lang];

  // 🔥 REALTIME UPDATES
  useEffect(() => {
    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [view]);

  async function loadAppointments() {
    setLoading(true);

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    let fromDate;
    let toDate;

    if (view === "today") {
      fromDate = today.toISOString().split("T")[0];
      toDate = fromDate;
    } else if (view === "tomorrow") {
      fromDate = tomorrow.toISOString().split("T")[0];
      toDate = fromDate;
    } else {
      fromDate = today.toISOString().split("T")[0];
      toDate = nextWeek.toISOString().split("T")[0];
    }

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber", barber)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      console.error("SUPABASE ERROR:", error);
    } else {
      setAppointments(data);
    }

    setLoading(false);
  }

  // 🔥 CANCEL APPOINTMENT (with UI refresh)
 async function cancelAppointment(id) {
  if (!confirm(tr.cancel)) return;

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("DELETE ERROR:", error);
    alert("Delete failed: " + error.message);
  } else {
    await loadAppointments(); // 🔥 force refresh
  }
}

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Language Toggle */}
      <div className="flex justify-end mb-4 gap-2 items-center">
        <span className="text-sm">{tr.langLabel}:</span>

        <button
          className={`px-2 py-1 text-sm rounded ${
            lang === "es" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("es")}
        >
          {tr.es}
        </button>

        <button
          className={`px-2 py-1 text-sm rounded ${
            lang === "en" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("en")}
        >
          {tr.en}
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-2">{tr.title}</h1>
      <h2 className="text-xl mb-6">{tr.barber}: {barber}</h2>

      {/* FILTER BUTTONS */}
      <div className="flex gap-3 mb-6">
        <button
          className={`px-4 py-2 rounded ${
            view === "today" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setView("today")}
        >
          {tr.today}
        </button>

        <button
          className={`px-4 py-2 rounded ${
            view === "tomorrow" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setView("tomorrow")}
        >
          {tr.tomorrow}
        </button>

        <button
          className={`px-4 py-2 rounded ${
            view === "week" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setView("week")}
        >
          {tr.week}
        </button>
      </div>

      {loading ? (
        <p>{tr.loading}</p>
      ) : appointments.length === 0 ? (
        <p>{tr.none}</p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div key={appt.id} className="p-4 border rounded-xl bg-white shadow-sm">
              <p><strong>{tr.date}:</strong> {appt.date}</p>
              <p><strong>{tr.time}:</strong> {appt.time}</p>
              <p><strong>{tr.service}:</strong> {appt.service}</p>

              <hr className="my-2" />

              <p><strong>{tr.customer}:</strong> {appt.customer_name}</p>
              <p><strong>{tr.phone}:</strong> {appt.customer_phone}</p>
              <p><strong>{tr.email}:</strong> {appt.customer_email || "N/A"}</p>
              <p><strong>{tr.notes}:</strong> {appt.notes || tr.noNotes}</p>

             {/* 🔥 CANCEL BUTTON */}
<button
  className="mt-3 w-full bg-red-600 text-white py-2 rounded-lg"
  onClick={() => cancelAppointment(appt.id)}
>
  {tr.cancel}
</button>

{/* 🔥 RESCHEDULE BUTTON */}
<button
  className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg"
  onClick={() =>
    (window.location.href = `/barber/${barber}/reschedule/${appt.id}`)
  }
>
  {tr.reschedule}
</button>
</div>
))}
</div>
)}

{/* ⭐ ADD THE BLOCKING PANEL HERE ⭐ */}
<BlockingPanel barber={barber} lang={lang} />


</div>
);
}
