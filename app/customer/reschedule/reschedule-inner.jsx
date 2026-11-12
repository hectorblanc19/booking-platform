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

function formatTime12(time) {
  if (!time) return "";

  const [hourString, minute] = time.split(":");
  let hour = Number(hourString);

  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

// DOMINICAN REPUBLIC CURRENT DATE AND TIME
function getBusinessNow(timezone = "America/Santo_Domingo") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hours: Number(values.hour),
    minutes: Number(values.minute),
  };
}

// CHECK IF APPOINTMENT HAS PASSED IN DOMINICAN REPUBLIC
function isAppointmentPastInBusiness(date, time, timezone) {
  if (!date || !time) return false;

  const dominicanNow = getBusinessNow(timezone);

  if (date < dominicanNow.date) {
    return true;
  }

  if (date > dominicanNow.date) {
    return false;
  }

  const [hour, minute] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  const appointmentMinutes = hour * 60 + minute;

  const currentMinutes =
    dominicanNow.hours * 60 + dominicanNow.minutes;

  return appointmentMinutes < currentMinutes;
}


// Time slot button
function TimeSlot({ time, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(time)}
      className={`px-4 py-2 rounded-xl border text-center ${
        selected === time ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {formatTime12(time)}
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
useEffect(() => {
  if (!appointment) return;

  const channel = supabase
    .channel(`appointment-${appointment.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "appointments",
        filter: `id=eq.${appointment.id}`,
      },
      (payload) => {
        console.log("Realtime update (reschedule page):", payload);
        loadAppointment();   // ⭐ reload instantly
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [appointment]);


  async function loadAppointment() {
    try {
      const response = await fetch("/api/customer/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.appointment) {
        setAppointment("not-found");
        return;
      }

      const appt = result.appointment;

      if (appt.lang === "es" || appt.lang === "en") {
        setLang(appt.lang);
      }

      let appointmentTimezone = "America/Santo_Domingo";

      if (appt.business_id) {
        const { data: businessData, error: timezoneError } =
          await supabase
            .from("businesses")
            .select("timezone")
            .eq("id", appt.business_id)
            .maybeSingle();

        if (timezoneError || !businessData?.timezone) {
          console.error("Unable to load business timezone", timezoneError);
          setAppointment("not-found");
          return;
        }

        appointmentTimezone = businessData.timezone;
      }

      setAppointment({
        ...appt,
        businessTimezone: appointmentTimezone,
      });
    } catch (error) {
      console.error("Appointment loading failed:", error);
      setAppointment("not-found");
    } finally {
      setLoading(false);
    }
  }
  async function loadAvailableTimes(selectedDate) {
    if (!selectedDate || !appointment || !secret) {
      setAvailableTimes([]);
      return;
    }

    setLoadingTimes(true);
    setAvailableTimes([]);

    try {
      const response = await fetch("/api/customer/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          date: selectedDate,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error("Availability API error:", result);
        setAvailableTimes([]);
        return;
      }

      setAvailableTimes(
        Array.isArray(result.times) ? result.times : []
      );
    } catch (error) {
      console.error("Availability request failed:", error);
      setAvailableTimes([]);
    } finally {
      setLoadingTimes(false);
    }
  }
  async function saveChanges() {
    if (!newDate || !newTime) {
      alert(tr.selectDateTime);
      return;
    }

    if (!secret) {
      alert(lang === "es"
        ? "Enlace de cita no válido."
        : "Invalid appointment link.");
      return;
    }

    try {
      const response = await fetch("/api/customer/reschedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret,
          date: newDate,
          time: newTime,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error("Reschedule API error:", result);
        alert(
          result.error ||
          (lang === "es"
            ? "No se pudo reprogramar la cita."
            : "Could not reschedule appointment.")
        );
        return;
      }

      router.push(`/customer/${secret}`);
    } catch (error) {
      console.error("Reschedule request failed:", error);
      alert(
        lang === "es"
          ? "Error de conexión. Inténtelo nuevamente."
          : "Connection error. Please try again."
      );
    }
  }
  if (appointment === "not-found") {
    return <p className="p-6 text-red-600">{tr.notFound}</p>;
  }

 if (loading) return <p className="p-6">{tr.loading}</p>;

const isPast = isAppointmentPastInBusiness(
  appointment.date,
  appointment.time, appointment.businessTimezone
);

return (
  <div className="max-w-xl mx-auto p-6">

      {/* Language Toggle */}
<div className="flex justify-end gap-2 mb-4">
  <span className="text-sm">
    {lang === "es" ? "Idioma:" : "Language:"}
  </span>

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
          <strong>{tr.currentTime}:</strong> {formatTime12(appointment.time)}
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
              min={getBusinessNow(appointment.businessTimezone).date}
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
    <p>
      {appointment.provider_id
        ? lang === "es"
          ? "El profesional no está disponible este día."
          : "The professional is not available on this day."
        : tr.blockedDay}
    </p>
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
