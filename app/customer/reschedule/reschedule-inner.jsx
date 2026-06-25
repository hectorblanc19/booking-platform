"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
    selectDateTime: "Please select a new date and time",
    loading: "Loading...",
    notFound: "Appointment not found.",
    past: "This appointment has already passed. You cannot reschedule.",
  },
  es: {
    title: "Reprogramar Cita",
    currentDate: "Fecha Actual",
    currentTime: "Hora Actual",
    newDate: "Nueva Fecha",
    newTime: "Nueva Hora",
    save: "Guardar Cambios",
    back: "Atrás",
    selectDateTime: "Seleccione una nueva fecha y hora",
    loading: "Cargando...",
    notFound: "Cita no encontrada.",
    past: "Esta cita ya pasó. No se puede reprogramar.",
  },
};

export default function RescheduleInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const secret = searchParams.get("secret");

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
    const { data: appt } = await supabase
      .from("appointments")
      .select("*")
      .eq("secret_link", secret)
      .single();

    if (!appt) {
      setAppointment("not-found");
      return;
    }

    setAppointment(appt);
    setLoading(false);
  }

  async function saveChanges() {
    if (!newDate || !newTime) {
      alert(tr.selectDateTime);
      return;
    }

    // ⭐ BACKEND PROTECTION: Prevent rescheduling past appointments
    const now = new Date();
    const apptDateTime = new Date(`${appointment.date}T${appointment.time}`);

    if (apptDateTime < now) {
      alert(tr.past);
      return;
    }

    const formattedTime = newTime + ":00";

    await supabase
      .from("appointments")
      .update({
        date: newDate,
        time: formattedTime,
        status: "confirmed",
      })
      .eq("secret_link", secret);

    router.push(`/customer/${secret}`);
  }

  if (appointment === "not-found") {
    return <p className="p-6 text-red-600">{tr.notFound}</p>;
  }

  if (loading) return <p className="p-6">{tr.loading}</p>;

  // ⭐ FRONTEND PROTECTION: Detect if appointment is in the past
  const now = new Date();
  const apptDateTime = new Date(`${appointment.date}T${appointment.time}`);
  const isPast = apptDateTime < now;

  return (
    <div className="max-w-xl mx-auto p-6">

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

      <div className="border p-4 rounded-xl bg-white shadow-sm">
        <p><strong>{tr.currentDate}:</strong> {appointment.date}</p>
        <p><strong>{tr.currentTime}:</strong> {appointment.time}</p>
      </div>

      {/* ⭐ If appointment is in the past, block rescheduling */}
      {isPast ? (
        <p className="mt-4 text-red-600 font-semibold text-center">{tr.past}</p>
      ) : (
        <>
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
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl"
            onClick={saveChanges}
          >
            {tr.save}
          </button>
        </>
      )}

      <button
        className="mt-3 w-full bg-gray-300 py-3 rounded-xl"
        onClick={() => router.push(`/customer/${secret}`)}
      >
        {tr.back}
      </button>
    </div>
  );
}
