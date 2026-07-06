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
    blockedDay: "The barber is not available on this day.",
    selectTime: "Select a time",
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
    blockedDay: "El barbero no está disponible este día.",
    selectTime: "Seleccione una hora",
  },
};

// Simple visual time slot button
function TimeSlot({ time, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(time)}
      className={`px-4 py-2 rounded-xl border text-center
        ${selected === time ? "bg-black text-white" : "bg-white text-black"}
      `}
    >
      {time}
    </button>
  );
}

export default function RescheduleInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const secret = searchParams.get("secret");

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

  async function loadAvailableTimes(selectedDate) {
    if (!selectedDate || !appointment) return;

    setLoadingTimes(true);

    const dayOfWeek = new Date(selectedDate)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    const { data: availability } = await supabase
      .from("barber_availability")
      .select("*")
      .eq("barber_id", appointment.barber_id)
      .eq("day_of_week", dayOfWeek)
      .single();

    if (!availability || availability.is_closed) {
      setAvailableTimes([]);
      setLoadingTimes(false);
      return;
    }

    const startHour = parseInt(availability.start_time.split(":")[0]);
    const endHour = parseInt(availability.end_time.split(":")[0]);

    let slots = [];
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }

    // Existing confirmed appointments
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", appointment.barber_id)
      .eq("date", selectedDate)
      .eq("status", "confirmed");

    const booked = appointments?.map((a) => a.time.slice(0, 5)) || [];
    slots = slots.filter((t) => !booked.includes(t));

    // Barber blocks
    const { data: blocks } = await supabase
      .from("barber_blocks")
      .select("*")
      .eq("barber_id", appointment.barber_id)
      .eq("date", selectedDate);

    if (blocks && blocks.length > 0) {
      blocks.forEach((block) => {
        const blockStartHour = parseInt(block.start_time.split(":")[0]);
        const blockEndHour = parseInt(block.end_time.split(":")[0]);

        for (let h = blockStartHour; h < blockEndHour; h++) {
          const blockedHour = `${h.toString().padStart(2, "0")}:00`;
          slots = slots.filter((t) => t !== blockedHour);
        }
      });
    }

    // Same-day: remove past times
    const today = new Date().toISOString().split("T")[0];
    if (selectedDate === today) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      slots = slots.filter((slot) => slot >= currentTime);
    }

    setAvailableTimes(slots);
    setLoadingTimes(false);
  }

  async function saveChanges() {
    if (!newDate || !newTime) {
      alert(tr.selectDateTime);
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

    // Load availability again for safety
    const dayOfWeek = new Date(newDate)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    const { data: availability } = await supabase
      .from("barber_availability")
      .select("*")
      .eq("barber_id", appointment.barber_id)
      .eq("day_of_week", dayOfWeek)
      .single();

    if (!availability || availability.is_closed) {
      alert(
        lang === "es"
          ? "El barbero no trabaja este día."
          : "Barber is not available on this day."
      );
      return;
    }

    const selectedTime = newTime + ":00";

    if (
      selectedTime < availability.start_time ||
      selectedTime >= availability.end_time
    ) {
      alert(
        lang === "es"
          ? `El barbero solo trabaja de ${availability.start_time} a ${availability.end_time}.`
          : `Barber only works from ${availability.start_time} to ${availability.end_time}.`
      );
      return;
    }

    // Blocks
    const { data: blocks } = await supabase
      .from("barber_blocks")
      .select("*")
      .eq("barber_id", appointment.barber_id)
      .eq("date", newDate);

    if (blocks && blocks.length > 0) {
      for (const block of blocks) {
        if (
          selectedTime >= block.start_time &&
          selectedTime < block.end_time
        ) {
          alert(
            lang === "es"
              ? "Esta hora está bloqueada por el barbero."
              : "This time is blocked by the barber."
          );
          return;
        }
      }
    }

    // Already booked
    const { data: existing } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", appointment.barber_id)
      .eq("date", newDate)
      .eq("status", "confirmed");

    const booked = existing.map((a) => a.time.slice(0, 5));
    if (booked.includes(newTime)) {
      alert(
        lang === "es"
          ? "Esta hora ya está ocupada."
          : "This time is already booked."
      );
      return;
    }

    // Same-day past time
    const today = new Date().toISOString().split("T")[0];
    if (newDate === today) {
      const currentTime = new Date().toTimeString().slice(0, 5);
      if (newTime < currentTime) {
        alert(
          lang === "es"
            ? "No puede seleccionar una hora pasada."
            : "You cannot select a past time today."
        );
        return;
      }
    }

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

  const now = new Date();
  const apptDateTime = new Date(`${appointment.date}T${appointment.time}`);
  const isPast = apptDateTime < now;

  return (
    <div className="max-w-xl mx-auto p-6">

      {/* Language Toggle */}
      <div className="flex justify-end gap-2 mb-4">
        <span className="text-sm">Idioma:</span>
        <button
          className={`px-2 py-1 rounded ${
            lang === "es" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
        <button
          className={`px-2 py-1 rounded ${
            lang === "en" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-4">{tr.title}</h1>

      <div className="border p-4 rounded-xl bg-white shadow-sm">
        <p>
          <strong>{tr.currentDate}:</strong> {appointment.date}
        </p>
        <p>
          <strong>{tr.currentTime}:</strong> {appointment.time}
        </p>
      </div>

      {isPast ? (
        <p className="mt-4 text-red-600 font-semibold text-center">
          {tr.past}
        </p>
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
