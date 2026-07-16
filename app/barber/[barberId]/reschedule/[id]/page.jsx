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
    past: "This appointment has already passed. You cannot reschedule.",
    selectTime: "Select a time",
    blockedDay: "Barber is not available this day.",
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
    past: "Esta cita ya pasó. No se puede reprogramar.",
    selectTime: "Seleccione una hora",
    blockedDay: "El barbero no está disponible este día.",
  },
};

// Simple time slot button
function TimeSlot({ time, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(time)}
      className={`px-4 py-2 rounded-xl border text-center ${
        selected === time ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {time}
    </button>
  );
}

export default function ReschedulePage() {
  const { barberId, id } = useParams();

  const [lang, setLang] = useState("es");
  const tr = t[lang];

  const [appointment, setAppointment] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointment();
  }, []);

  async function loadAppointment() {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    setAppointment(data);
    setLoading(false);
  }

  async function loadAvailableTimes(selectedDate) {
    if (!selectedDate || !appointment) return;

    setLoadingTimes(true);

    // ⭐ Block past dates completely
    const todayDate = new Date().toISOString().split("T")[0];
    if (selectedDate < todayDate) {
      setAvailableTimes([]);
      setLoadingTimes(false);
      return;
    }

    // ⭐ FIXED: Local-time date parsing
    const dayOfWeek = new Date(selectedDate + "T00:00:00")
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    // Barber availability
    const { data: availability } = await supabase
      .from("barber_availability")
      .select("*")
      .eq("barber_id", barberId)
      .eq("day_of_week", dayOfWeek)
      .single();

    if (!availability || availability.is_closed) {
      setAvailableTimes([]);
      setLoadingTimes(false);
      return;
    }

    // ⭐ Duration-aware slot generation
    let slots = [];

    let current = new Date(`${selectedDate}T${availability.start_time}`);
    const end = new Date(`${selectedDate}T${availability.end_time}`);

    const selectedDuration = appointment.duration || 60;

    while (current < end) {
      const slotStr = current.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      slots.push(slotStr);

      current = new Date(current.getTime() + selectedDuration * 60 * 1000);
    }

    // Booked appointments
    const { data: bookedAppts } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", barberId)
      .eq("date", selectedDate)
      .eq("status", "confirmed");

    const booked = bookedAppts?.map((a) => a.time.slice(0, 5)) || [];
    slots = slots.filter((t) => !booked.includes(t));

    // Barber blocks
    const { data: blocks } = await supabase
      .from("barber_blocks")
      .select("*")
      .eq("barber_id", barberId)
      .eq("date", selectedDate);

    if (blocks && blocks.length > 0) {
      blocks.forEach((block) => {
        const blockStart = block.start_time.slice(0, 5);
        const blockEnd = block.end_time.slice(0, 5);

        slots = slots.filter(
          (t) => !(t >= blockStart && t < blockEnd)
        );
      });
    }

    // ⭐ SAME-DAY: remove past times
    if (selectedDate === todayDate) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const toMinutes = (t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };

      slots = slots.filter((t) => toMinutes(t) >= toMinutes(currentTime));
    }

    setAvailableTimes(slots);
    setLoadingTimes(false);
  }

  async function saveChanges() {
    if (!newDate || !newTime) {
      alert(tr.selectDateTime);
      return;
    }

    // ⭐ Block saving past dates
    const todayDate = new Date().toISOString().split("T")[0];
    if (newDate < todayDate) {
      alert(
        lang === "es"
          ? "No puede seleccionar una fecha pasada."
          : "You cannot select a past date."
      );
      return;
    }

    // Prevent rescheduling past appointments
    const now = new Date();
    const apptDateTime = new Date(`${appointment.date}T${appointment.time}`);

    if (apptDateTime < now) {
      alert(tr.past);
      return;
    }

    const formattedTime = newTime + ":00";

    // ⭐ UPDATE APPOINTMENT
    await supabase
      .from("appointments")
      .update({
        date: newDate,
        time: formattedTime,
      })
      .eq("id", id);

    // Push notification to customer
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "customer",
        secret_link: appointment.secret_link,
        title: "Appointment Updated",
        message: `Your barber changed your appointment to ${newDate} at ${newTime}.`,
      }),
    });

    window.location.href = `/barber/${barberId}/dashboard?refresh=${Date.now()}`;
  }

  if (loading) return <p className="p-6">{tr.loading}</p>;

  const now = new Date();
  const apptDateTime = new Date(`${appointment.date}T${appointment.time}`);
  const isPast = apptDateTime < now;

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

      {isPast ? (
        <p className="mt-4 text-red-600 font-semibold text-center">{tr.past}</p>
      ) : (
        <>
          {/* New Date */}
          <div className="mt-4">
            <label className="block mb-1">{tr.newDate}</label>
            <input
              type="date"
              className="w-full p-3 border rounded-xl"
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => {
                setNewDate(e.target.value);
                setNewTime("");
                loadAvailableTimes(e.target.value);
              }}
            />
          </div>

          {/* Time slots */}
          {newDate && !loadingTimes && availableTimes.length === 0 && (
            <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700">
              <p>{tr.blockedDay}</p>
            </div>
          )}

          {newDate && loadingTimes && (
            <p className="mt-4 text-sm text-gray-500">{tr.loading}</p>
          )}

          {newDate && !loadingTimes && availableTimes.length > 0 && (
            <>
              <p className="mt-4 text-sm text-gray-700">{tr.selectTime}</p>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {availableTimes.map((t) => (
                  <TimeSlot
                    key={t}
                    time={t}
                    selected={newTime}
                    onSelect={setNewTime}
                  />
                ))}
              </div>
            </>
          )}

          <button
            className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl"
            onClick={saveChanges}
          >
            {tr.save}
          </button>
        </>
      )}

      <button
        className="mt-3 w-full bg-gray-300 py-3 rounded-xl"
        onClick={() => window.history.back()}
      >
        {tr.back}
      </button>
    </div>
  );
}
