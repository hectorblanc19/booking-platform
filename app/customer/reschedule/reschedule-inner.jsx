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
function getDominicanNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
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
function isAppointmentPastInDominican(date, time) {
  if (!date || !time) return false;

  const dominicanNow = getDominicanNow();

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
  // FIRST TRY APPOINTMENT ID
  let { data: appt } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", secret)
    .maybeSingle();

  // FALLBACK FOR EXISTING BARBER / OLD SECRET LINKS
  if (!appt) {
    const { data: apptBySecret } = await supabase
      .from("appointments")
      .select("*")
      .eq("secret_link", secret)
      .maybeSingle();

    appt = apptBySecret;
  }

  if (!appt) {
  setAppointment("not-found");
  setLoading(false);
  return;
}

// Keep reschedule page in the language saved with the appointment
if (appt.lang === "es" || appt.lang === "en") {
  setLang(appt.lang);
}

setAppointment(appt);
setLoading(false);

}
  async function loadAvailableTimes(selectedDate) {
  if (!selectedDate || !appointment) return;

  setLoadingTimes(true);

  try {
    const dominicanNow = getDominicanNow();
const todayDate = dominicanNow.date;

    // DON'T ALLOW PAST DATES
    if (selectedDate < todayDate) {
      setAvailableTimes([]);
      return;
    }

    const selectedDateObject = new Date(
      `${selectedDate}T00:00:00`
    );

    const selectedDuration =
      Number(appointment.duration) || 60;

    let startTime = null;
    let endTime = null;

    // ============================================
    // GENERIC PROVIDER
    // ============================================
    if (appointment.provider_id) {
      const dayOfWeek = selectedDateObject.getDay();

      const { data: availability, error: availabilityError } =
        await supabase
          .from("provider_availability")
          .select("*")
          .eq("provider_id", appointment.provider_id)
          .eq("day_of_week", dayOfWeek)
          .maybeSingle();

      if (
        availabilityError ||
        !availability ||
        !availability.is_available
      ) {
        setAvailableTimes([]);
        return;
      }

      startTime = availability.start_time;
      endTime = availability.end_time;
    }

    // ============================================
    // BARBER — KEEP EXISTING SYSTEM
    // ============================================
    else if (appointment.barber_id) {
      const dayOfWeek = selectedDateObject
        .toLocaleDateString("en-US", {
          weekday: "long",
        })
        .toLowerCase();

      const { data: availability } = await supabase
        .from("barber_availability")
        .select("*")
        .eq("barber_id", appointment.barber_id)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();

      if (!availability || availability.is_closed) {
        setAvailableTimes([]);
        return;
      }

      startTime = availability.start_time;
      endTime = availability.end_time;
    } else {
      setAvailableTimes([]);
      return;
    }

    function toMinutes(time) {
      const [hours, minutes] = time
        .slice(0, 5)
        .split(":")
        .map(Number);

      return hours * 60 + minutes;
    }

    function toTime(minutes) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      return `${String(hours).padStart(2, "0")}:${String(
        mins
      ).padStart(2, "0")}`;
    }

    function overlaps(
      startA,
      durationA,
      startB,
      durationB
    ) {
      const aStart = toMinutes(startA);
      const aEnd = aStart + durationA;

      const bStart = toMinutes(startB);
      const bEnd = bStart + durationB;

      return aStart < bEnd && bStart < aEnd;
    }

    // GET EXISTING APPOINTMENTS
    let appointmentQuery = supabase
      .from("appointments")
      .select("id, time, duration")
      .eq("date", selectedDate)
      .eq("status", "confirmed")
      .neq("id", appointment.id);

    if (appointment.provider_id) {
      appointmentQuery = appointmentQuery.eq(
        "provider_id",
        appointment.provider_id
      );
    } else {
      appointmentQuery = appointmentQuery.eq(
        "barber_id",
        appointment.barber_id
      );
    }

    const { data: bookedAppointments } =
      await appointmentQuery;

    const existingAppointments =
      bookedAppointments || [];

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    let slots = [];

    // SAME 30-MINUTE SLOT SYSTEM AS GENERIC BOOKING
    for (
      let current = startMinutes;
      current + selectedDuration <= endMinutes;
      current += 30
    ) {
      // DON'T SHOW TIMES THAT ALREADY PASSED TODAY
      if (selectedDate === todayDate) {
        const currentMinutes =
  dominicanNow.hours * 60 + dominicanNow.minutes;
        if (current <= currentMinutes) {
          continue;
        }
      }

      const slotTime = toTime(current);

      const hasConflict = existingAppointments.some(
        (existingAppointment) =>
          overlaps(
            slotTime,
            selectedDuration,
            existingAppointment.time,
            Number(existingAppointment.duration) || 60
          )
      );

      if (!hasConflict) {
        slots.push(slotTime);
      }
    }

    // BARBER BLOCKS — BARBER ONLY
    if (appointment.barber_id) {
      const { data: blocks } = await supabase
        .from("barber_blocks")
        .select("*")
        .eq("barber_id", appointment.barber_id)
        .eq("date", selectedDate);

      if (blocks?.length) {
        slots = slots.filter((slot) => {
          return !blocks.some((block) => {
            const blockStart = block.start_time.slice(0, 5);
            const blockEnd = block.end_time.slice(0, 5);

            return (
              slot >= blockStart &&
              slot < blockEnd
            );
          });
        });
      }
    }

    setAvailableTimes(slots);
  } catch (error) {
    console.error(
      "Error loading reschedule times:",
      error
    );

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

    // ⭐ Block saving past dates
   const todayDate = getDominicanNow().date;
   
 if (newDate < todayDate) {
    alert(
        lang === "es"
          ? "No puede seleccionar una fecha pasada."
          : "You cannot select a past date."
      );
      return;
    }

   // Prevent rescheduling past appointments
if (
  isAppointmentPastInDominican(
    appointment.date,
    appointment.time
  )
) {
  alert(tr.past);
  return;
}

const formattedTime = newTime + ":00";

// ⭐ UPDATE APPOINTMENT
const { error: updateError } = await supabase
  .from("appointments")
  .update({
    date: newDate,
    time: formattedTime,
    status: "confirmed",
  })
  .eq("id", appointment.id);

if (updateError) {
  console.error("Reschedule update error:", updateError);

  alert(
    lang === "es"
      ? "Error reprogramando la cita."
      : "Error rescheduling appointment."
  );

  return;
}

// ⭐ SEND RESCHEDULE EMAIL TO PROVIDER
if (appointment.provider_id) {
  try {
    const { data: providerData } = await supabase
      .from("providers")
      .select("name, email")
      .eq("id", appointment.provider_id)
      .maybeSingle();

    if (providerData?.email) {
      const response = await fetch(
        "/api/send-barber-notification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            provider_email: providerData.email,
            provider_name: providerData.name,
            provider_id: appointment.provider_id,

            customer_name: appointment.customer_name,
            customer_phone: appointment.customer_phone,
            customer_email: appointment.customer_email,

            service: appointment.service,
            date: newDate,
            time: formattedTime,
            notes: appointment.notes || null,

           dashboard_link: null,

lang: appointment.lang || lang,
notification_type: "reschedule",
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        console.error(
          "Provider reschedule email error:",
          data
        );
      }
    }
  } catch (error) {
    console.error(
      "Provider reschedule email request failed:",
      error
    );
  }
}

// ⭐ SEND PUSH NOTIFICATION TO BARBER — BARBER APPOINTMENTS ONLY
if (appointment.barber_id) {
  const notificationLang = appointment.lang || lang;

  await fetch("/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      role: "business",
      barber_id: appointment.barber_id,
      title:
        notificationLang === "es"
          ? "Cita Reprogramada"
          : "Appointment Rescheduled",
      message:
        notificationLang === "es"
          ? `El cliente reprogramó su cita para el ${newDate} a las ${formatTime12(
              formattedTime
            )}.`
          : `Client moved appointment to ${newDate} at ${formatTime12(
              formattedTime
            )}.`,
    }),
  });
}   
 router.push(`/customer/${secret}`);
  }

  if (appointment === "not-found") {
    return <p className="p-6 text-red-600">{tr.notFound}</p>;
  }

 if (loading) return <p className="p-6">{tr.loading}</p>;

const isPast = isAppointmentPastInDominican(
  appointment.date,
  appointment.time
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
              min={getDominicanNow().date}
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
