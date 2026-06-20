"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Bilingual dictionary
const t = {
  en: {
    title: "Book with",
    business: "Business",
    service: "Service",
    date: "Date",
    time: "Time",
    name: "Your Name",
    phone: "Phone",
    email: "Email",
    notes: "Notes",
    book: "Book Appointment",
    lang: "Language",
    selectService: "Select a service",
    describeService: "Describe the service",
    writeHere: "Write the service here...",
    fillAll: "Please fill all fields",
    error: "Error creating appointment",
    slotTaken: "This time is already booked. Please choose another time.",
    selectTime: "Select a time",
    blockedDay: "The barber has blocked this day and is not available.",
  },
  es: {
    title: "Reservar con",
    business: "Negocio",
    service: "Servicio",
    date: "Fecha",
    time: "Hora",
    name: "Tu Nombre",
    phone: "Teléfono",
    email: "Correo",
    notes: "Notas",
    book: "Reservar Cita",
    lang: "Idioma",
    selectService: "Seleccione un servicio",
    describeService: "Describa el servicio",
    writeHere: "Escriba el servicio aquí...",
    fillAll: "Por favor complete todos los campos",
    error: "Error creando la cita",
    slotTaken: "Esta hora ya está reservada. Por favor elija otra hora.",
    selectTime: "Seleccione una hora",
    blockedDay: "El barbero ha bloqueado este día y no está disponible.",
  },
};

// Service dropdown options
const SERVICE_OPTIONS = [
  { value: "Haircut", es: "Corte" },
  { value: "Beard", es: "Barba" },
  { value: "Haircut + Beard", es: "Corte + Barba" },
  { value: "Fade", es: "Fade" },
  { value: "Other", es: "Otro" },
];

export default function BookingPage() {
  const { barberId } = useParams();

  const [lang, setLang] = useState("en");
  const tr = t[lang];

  const [barber, setBarber] = useState(null);
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBarber();
  }, []);

  async function loadBarber() {
    const { data, error } = await supabase
      .from("barbers")
      .select("*, businesses(*)")
      .eq("id", barberId)
      .single();

    if (!error) setBarber(data);
    setLoading(false);
  }

  // ⭐ Load available time slots
async function loadAvailableTimes(selectedDate) {
  if (!selectedDate) return;

  const dayOfWeek = new Date(selectedDate)
    .toLocaleDateString("en-US", { weekday: "long" })
    .toLowerCase();

  const { data: availability } = await supabase
    .from("barber_availability")
    .select("*")
    .eq("barber", barberId)
    .eq("day_of_week", dayOfWeek)
    .single();

  if (!availability || availability.is_closed) {
    setAvailableTimes([]);
    return;
  }

  const startHour = parseInt(availability.start_time.split(":")[0]);
  const endHour = parseInt(availability.end_time.split(":")[0]);

  // ⭐ FIXED: endHour is closing time, NOT a valid slot start
  let slots = [];
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
  }

  // ⭐ Remove already booked appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("barber_id", barberId)
    .eq("date", selectedDate)
    .eq("status", "confirmed");

  const booked = appointments?.map(a => a.time.slice(0, 5)) || [];
  slots = slots.filter(t => !booked.includes(t));

  // ⭐ Remove blocked hours
  const { data: blocks } = await supabase
    .from("barber_blocks")
    .select("*")
    .eq("barber", barberId)
    .eq("date", selectedDate);

  if (blocks && blocks.length > 0) {
    blocks.forEach(block => {
      const blockStart = parseInt(block.start_time.split(":")[0]);
      const blockEnd = parseInt(block.end_time.split(":")[0]);

      for (let h = blockStart; h < blockEnd; h++) {
        const blockedHour = `${h.toString().padStart(2, "0")}:00`;
        slots = slots.filter(t => t !== blockedHour);
      }
    });
  }

  setAvailableTimes(slots);
}

  async function createAppointment() {
    if (!service || !date || !time || !customerName || !customerPhone || !customerEmail) {
      alert(tr.fillAll);
      return;
    }

    const formattedTime = time + ":00";

    const newStart = new Date(`${date}T${formattedTime}`);
    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);

    const { data: existing } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", barberId)
      .eq("date", date)
      .eq("status", "confirmed");

    if (existing && existing.length > 0) {
      for (const appt of existing) {
        const existingStart = new Date(`${appt.date}T${appt.time}`);
        const existingEnd = new Date(existingStart.getTime() + 60 * 60 * 1000);

        if (existingStart < newEnd && existingEnd > newStart) {
          alert(tr.slotTaken);
          return;
        }
      }
    }

  const secret = crypto.randomUUID();

const { error } = await supabase.from("appointments").insert({
  business_id: barber.business_id,
  barber_id: barberId,
  service,
  date,
  time: formattedTime,
  duration: 60,
  customer_name: customerName,
  customer_phone: customerPhone,
  customer_email: customerEmail,
  notes,
  status: "confirmed",
  lang,
  secret_link: `https://flowpaydr.com/customer/${secret}`,  // ⭐ FIXED URL
});

if (error) {
  alert(tr.error);
  return;
}

// ⭐ SEND CUSTOMER EMAIL (with lang)
await fetch("/api/send-confirmation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customer_email: customerEmail,
    customer_name: customerName,
    service,
    barber_name: barber.name,
    business_name: barber.businesses?.name,
    date,
    time: formattedTime,
    secret_link: `https://flowpaydr.com/customer/${secret}`,   // ⭐ FIXED
    lang,
  }),
});

// ⭐ SEND BARBER EMAIL (with lang)
await fetch("/api/send-barber-notification", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    barber_email: barber.email,
    barber_name: barber.name,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    service,
    date,
    time: formattedTime,
    notes,
    dashboard_link: `https://flowpaydr.com/barber/${barberId}`,   // ⭐ FIXED
    lang,
  }),
});

// Redirect customer
window.location.href = `/customer/${secret}`;
}

if (loading) return <p className="p-6">Loading...</p>;
if (!barber) return <p className="p-6">Barber not found.</p>;

return (
  <div className="max-w-xl mx-auto p-6">

    {/* Language Toggle */}
    <div className="flex justify-end gap-2 mb-4">
      <span className="text-sm">{tr.lang}:</span>
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

    <h1 className="text-3xl font-bold mb-4">
      {tr.title} {barber.name}
    </h1>

    <p className="mb-4 text-gray-600">
      {tr.business}: {barber.businesses?.name || "Unknown"}
    </p>

    {/* SERVICE DROPDOWN */}
    <div className="mt-4">
      <label className="block mb-1">{tr.service}</label>

      <select
        className="w-full p-3 border rounded-xl"
        onChange={(e) => setService(e.target.value)}
      >
        <option value="">{tr.selectService}</option>

        {SERVICE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {lang === "en" ? opt.value : opt.es}
          </option>
        ))}
      </select>
    </div>

    {/* IF SERVICE = OTHER */}
    {service === "Other" && (
      <div className="mt-4">
        <label className="block mb-1">{tr.describeService}</label>
        <textarea
          className="w-full p-3 border rounded-xl"
          placeholder={tr.writeHere}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    )}

   {/* DATE */}
<div className="mt-4">
  <label className="block mb-1">{tr.date}</label>
  <input
    type="date"
    className="w-full p-3 border rounded-xl"
    min={new Date().toISOString().split("T")[0]}   // ⭐ prevents yesterday
    onChange={(e) => {
      setDate(e.target.value);
      loadAvailableTimes(e.target.value);
    }}
  />
</div>

{/* ⭐ BLOCKED DAY MESSAGE (LANG‑AWARE) */}
{date && availableTimes.length === 0 && (
  <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700">
    <p>{tr.blockedDay}</p>
  </div>
)}


    {/* TIME */}
    <div className="mt-4">
      <label className="block mb-1">{tr.time}</label>

      <select
        className="w-full p-3 border rounded-xl"
        onChange={(e) => setTime(e.target.value)}
      >
        <option value="">{tr.selectTime}</option>

        {availableTimes.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>

    {/* NAME */}
    <div className="mt-4">
      <label className="block mb-1">{tr.name}</label>
      <input
        type="text"
        className="w-full p-3 border rounded-xl"
        onChange={(e) => setCustomerName(e.target.value)}
      />
    </div>

    {/* PHONE */}
    <div className="mt-4">
      <label className="block mb-1">{tr.phone}</label>
      <input
        type="tel"
        className="w-full p-3 border rounded-xl"
        onChange={(e) => setCustomerPhone(e.target.value)}
      />
    </div>

    {/* EMAIL */}
    <div className="mt-4">
      <label className="block mb-1">{tr.email}</label>
      <input
        type="email"
        className="w-full p-3 border rounded-xl"
        onChange={(e) => setCustomerEmail(e.target.value)}
      />
    </div>

    {/* NOTES */}
    {service !== "Other" && (
      <div className="mt-4">
        <label className="block mb-1">{tr.notes}</label>
        <textarea
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    )}

    {/* SUBMIT */}
    <button
      className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl"
      onClick={createAppointment}
    >
      {tr.book}
    </button>
  </div>
);
}
