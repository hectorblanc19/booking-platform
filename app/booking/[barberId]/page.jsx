"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";


// ⭐ Visual Time Slot Component
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
  { value: "Haircut", es: "Corte", duration: 30 },
  { value: "Beard", es: "Barba", duration: 20 },
  { value: "Haircut + Beard", es: "Corte + Barba", duration: 45 },
  { value: "Fade", es: "Fade", duration: 40 },
  { value: "Other", es: "Otro", duration: 0 },
];

export default function BookingPage() {
  const { barberId } = useParams();
console.log("barberId:", barberId);

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

  const [loadingTimes, setLoadingTimes] = useState(false);

  // ⭐ Reviews state
const [reviews, setReviews] = useState([]);
const [showReviews, setShowReviews] = useState(false);   // ⭐ ADD THIS LINE

// ⭐ Load barber first
useEffect(() => {
  loadBarber();
}, []);

// ⭐ Load reviews AFTER barberId is available
useEffect(() => {
  if (barberId) {
    loadReviews();
  }
}, [barberId]);

  async function loadBarber() {
    const { data, error } = await supabase
      .from("barbers")
      .select("*, businesses(*)")
      .eq("id", barberId)
      .single();

    if (!error) setBarber(data);
    setLoading(false);

    if (data?.payment_status === "unpaid") {
      setBarber({ ...data, blocked: true });
    }
  }

  // ⭐ Load reviews
  async function loadReviews() {
    const { data, error } = await supabase
      .from("ratings")
      .select("rating, review_text, created_at")
      .eq("barber_id", barberId)
      .order("created_at", { ascending: false });

    if (!error) setReviews(data || []);
  }

  // ⭐ Available times logic (unchanged)
  async function loadAvailableTimes(selectedDate) {
    if (!selectedDate) return;

    setLoadingTimes(true);

    const dayOfWeek = new Date(selectedDate)
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

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

    let slots = [];

    let current = new Date(`${selectedDate}T${availability.start_time}`);
    const end = new Date(`${selectedDate}T${availability.end_time}`);

    const selectedDuration =
      SERVICE_OPTIONS.find(s => s.value === service)?.duration || 60;

    while (current < end) {
      const slotStr = current.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      slots.push(slotStr);

      current = new Date(current.getTime() + selectedDuration * 60 * 1000);
    }

    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", barberId)
      .eq("date", selectedDate)
      .eq("status", "confirmed");

    const booked = appointments?.map(a => a.time.slice(0, 5)) || [];
    slots = slots.filter(t => !booked.includes(t));

    const { data: blocks } = await supabase
      .from("barber_blocks")
      .select("*")
      .eq("barber_id", barberId)
      .eq("date", selectedDate);

    if (blocks && blocks.length > 0) {
      blocks.forEach(block => {
        const blockStart = block.start_time.slice(0, 5);
        const blockEnd = block.end_time.slice(0, 5);

        slots = slots.filter(t => !(t >= blockStart && t < blockEnd));
      });
    }

    const today = new Date().toLocaleDateString("en-CA");

    if (selectedDate === today) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      slots = slots.filter(slot => slot >= currentTime);
    }

    setAvailableTimes(slots);
    setLoadingTimes(false);
  }

  async function createAppointment() {
    if (!service || !date || !time || !customerName || !customerPhone || !customerEmail) {
      alert(tr.fillAll);
      return;
    }

    const formattedTime = time + ":00";

    const newStart = new Date(`${date}T${formattedTime}`);

    const selectedDuration =
      SERVICE_OPTIONS.find(s => s.value === service)?.duration || 60;

    const newEnd = new Date(newStart.getTime() + selectedDuration * 60 * 1000);

    const { data: existing } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", barberId)
      .eq("date", date)
      .eq("status", "confirmed");

    if (existing && existing.length > 0) {
      for (const appt of existing) {
        const existingStart = new Date(`${appt.date}T${appt.time}`);

        const existingEnd = new Date(
          existingStart.getTime() + (appt.duration || 60) * 60 * 1000
        );

        if (existingStart < newEnd && existingEnd > newStart) {
          alert(tr.slotTaken);
          return;
        }
      }
    }

    const secret = crypto.randomUUID();

    await supabase.from("appointments").insert({
      business_id: barber.business_id,
      barber_id: barberId,
      service,
      date,
      time: formattedTime,
      duration: SERVICE_OPTIONS.find(s => s.value === service)?.duration || 60,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      notes,
      status: "confirmed",
      lang,
      secret_link: secret,
    });

    await fetch("/api/send-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_email: customerEmail,
        customer_name: customerName,
        service,
        barber_id: barberId,
        business_id: barber.business_id,
        date,
        time: formattedTime,
        secret_link: `https://flowpaydr.com/customer/${secret}`,
        lang,
      }),
    });

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
        dashboard_link: `https://flowpaydr.com/barber/${barberId}`,
        lang,
      }),
    });

    window.location.href = `/customer/${secret}`;
  }

  if (loading) return <p className="p-6">Loading...</p>;
  if (!barber) return <p className="p-6">Barber not found.</p>;

  if (barber?.payment_status === "unpaid" || barber?.blocked) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600">Barber Unavailable</h1>
        <p>This barber is currently blocked by the administrator.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">

      {/* ⭐ Language Switch */}
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

      {/* ⭐ Barber Header */}
      <div className="flex items-center gap-4 mb-6 mt-2 p-4 bg-white rounded-xl shadow-sm">
        <img
          src={barber.photo_url || "/default-barber.png"}
          alt={barber.name}
          className="w-20 h-20 rounded-full object-cover border shadow"
        />

        <div>
          <h1 className="text-2xl font-bold">
            {tr.title} {barber.name}
          </h1>

          {/* ⭐ Business Barber */}
          {barber.businesses ? (
            <>
              <p className="text-gray-500">
                {tr.business}: {barber.businesses.name}
              </p>

              {barber.businesses.address && (
                <p className="text-sm text-gray-500">📍 {barber.businesses.address}</p>
              )}

              {barber.businesses.phone && (
                <p className="text-sm text-gray-500">📞 {barber.businesses.phone}</p>
              )}
            </>
          ) : (
            /* ⭐ Independent Barber */
            <>
              <p className="text-gray-500">
                {tr.business}: Independent Barber
              </p>

              {barber.address && (
                <p className="text-sm text-gray-500">📍 {barber.address}</p>
              )}

              {barber.phone && (
                <p className="text-sm text-gray-500">📞 {barber.phone}</p>
              )}
            </>
          )}
        </div>
      </div>

{/* ⭐ Barber Rating Summary (compact + toggle) */}
<div className="mb-6 p-4 bg-white rounded-xl shadow">
  <h2 className="text-xl font-bold mb-2">
    {lang === "en" ? "Barber Rating" : "Calificación del Barbero"}
  </h2>

  {reviews.length > 0 ? (
    <>
      <p className="text-lg font-semibold">
        ⭐ {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)} / 5
      </p>

      <p className="text-gray-600 text-sm">
        {reviews.length} {lang === "en" ? "reviews" : "reseñas"}
      </p>

      <button
        className="mt-2 text-blue-600 underline text-sm"
        onClick={() => setShowReviews(!showReviews)}
      >
        {showReviews
          ? lang === "en" ? "Hide Reviews" : "Ocultar Reseñas"
          : lang === "en" ? "Show Reviews" : "Mostrar Reseñas"}
      </button>
    </>
  ) : (
    <p className="text-gray-500 text-sm">
      {lang === "en" ? "No reviews yet" : "No hay reseñas todavía"}
    </p>
  )}
</div>

{/* ⭐ Reviews Section (hidden by default, limited to 5) */}
{showReviews && (
  <div className="mb-6 p-4 bg-white rounded-xl shadow">
    <h2 className="text-xl font-bold mb-3">
      {lang === "en" ? "Reviews" : "Reseñas"}
    </h2>

    {reviews.slice(0, 5).map((rev, index) => (
      <div key={index} className="mb-4 border-b pb-3">
        <p className="text-yellow-500 font-bold">
          ⭐ {rev.rating} / 5
        </p>

       <p className="text-gray-700 mt-1 text-sm">
  “{rev.review_text || (lang === "en" ? "No comment" : "Sin comentario")}”
</p>

        <p className="text-gray-400 text-xs mt-1">
          {new Date(rev.created_at).toLocaleDateString()}
        </p>
      </div>
    ))}
  </div>
)}

      {/* ⭐ Service */}
      <div className="mt-4">
        <label className="block mb-1">{tr.service}</label>

        <select
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setService(e.target.value)}
        >
          <option value="">{tr.selectService}</option>

          {SERVICE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {lang === "en"
                ? `${opt.value} — ${opt.duration} min`
                : `${opt.es} — ${opt.duration} min`}
            </option>
          ))}
        </select>
      </div>

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

      {/* ⭐ Date */}
      <div className="mt-4">
        <label className="block mb-1">{tr.date}</label>
        <input
          type="date"
          className="w-full p-3 border rounded-xl"
          min={new Date().toLocaleDateString("en-CA")}
          onChange={(e) => {
            const raw = e.target.value;
            const normalized = new Date(raw + "T00:00:00").toLocaleDateString("en-CA");
            setDate(normalized);
            loadAvailableTimes(normalized);
          }}
        />
      </div>

      {date && availableTimes.length === 0 && !loadingTimes && (
        <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700">
          <p>{tr.blockedDay}</p>
        </div>
      )}

      {/* ⭐ Time Slots */}
      {!loadingTimes && availableTimes.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          {availableTimes.map((t) => (
            <TimeSlot
              key={t}
              time={t}
              selected={time}
              onSelect={setTime}
            />
          ))}
        </div>
      )}

      {/* ⭐ Customer Info */}
      <div className="mt-4">
        <label className="block mb-1">{tr.name}</label>
        <input
          type="text"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setCustomerName(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className="block mb-1">{tr.phone}</label>
        <input
          type="tel"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className="block mb-1">{tr.email}</label>
        <input
          type="email"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setCustomerEmail(e.target.value)}
        />
      </div>

      {service !== "Other" && (
        <div className="mt-4">
          <label className="block mb-1">{tr.notes}</label>
          <textarea
            className="w-full p-3 border rounded-xl"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}

      {/* ⭐ Book Button */}
      <button
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl"
        onClick={createAppointment}
      >
        {tr.book}
      </button>

    </div>
  );
}
