"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Bilingual dictionary
const t = {
  en: {
    title: "Reschedule Appointment",
    currentDate: "Current Date",
    currentTime: "Current Time",
    newDate: "New Date",
    newTime: "New Time",
    save: "Save Changes",
    back: "Back",
    selectDateTime: "Select date and time",
    loading: "Loading...",
  },
  es: {
    title: "Reprogramar Cita",
    currentDate: "Fecha Actual",
    currentTime: "Hora Actual",
    newDate: "Nueva Fecha",
    newTime: "Nueva Hora",
    save: "Guardar Cambios",
    back: "Atrás",
    selectDateTime: "Seleccione fecha y hora",
    loading: "Cargando...",
  },
};

export default function ReschedulePage() {
  const { barberId, id } = useParams();

  const [lang, setLang] = useState("es");
  const tr = t[lang];

  const [appointment, setAppointment] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointment();
  }, []);

  async function loadAppointment() {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error loading appointment:", error);
      alert("Error loading appointment: " + error.message);
      return;
    }

    setAppointment(data);
    setLoading(false);
  }

  async function saveChanges() {
    if (!newDate || !newTime) {
      alert(tr.selectDateTime);
      return;
    }

    const formattedTime = newTime + ":00";

    const { error } = await supabase
      .from("appointments")
      .update({
        date: newDate,
        time: formattedTime,
      })
      .eq("id", id);

    if (error) {
      console.error("UPDATE ERROR:", error);
      alert("Update failed: " + error.message);
    } else {
      window.location.href = `/barber/${barberId}/dashboard?refresh=${Date.now()}`;
    }
  }

  if (loading) return <p className="p-6">{tr.loading}</p>;

  return (
    <div className="p-6 max-w-lg mx-auto">

      {/* Language Toggle */}
      <div className="flex justify-end gap-2 mb-4">
        <span className="text-sm">Idioma:</span>
        <button
          className={`px-2 py-1 rounded ${lang === "es" ? "bg-black text-white" : "bg-gray-200"}`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
        <button
          className={`px-2 py-1 rounded ${lang === "en" ? "bg-black text-white" : "bg-gray-200"}`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-4">{tr.title}</h1>

      <p><strong>{tr.currentDate}:</strong> {appointment.date}</p>
      <p><strong>{tr.currentTime}:</strong> {appointment.time}</p>

      <div className="mt-4">
        <label className="block mb-1">{tr.newDate}</label>
        <input
          type="date"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setNewDate(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className="block mb-1">{tr.newTime}</label>
        <input
          type="time"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setNewTime(e.target.value)}
        />
      </div>

      <button
        className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl"
        onClick={saveChanges}
      >
        {tr.save}
      </button>

      <button
        className="mt-3 w-full bg-gray-300 py-3 rounded-xl"
        onClick={() => window.history.back()}
      >
        {tr.back}
      </button>
    </div>
  );
}
