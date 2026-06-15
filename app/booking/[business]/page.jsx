"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createAppointment } from "@/lib/appointments";
import { createClient } from "@supabase/supabase-js";

// Correct relative imports
import BarberSelector from "../../../components/BarberSelector.jsx";
import ServiceSelector from "../../../components/ServiceSelector.jsx";
import DateSelector from "../../../components/DateSelector.jsx";
import CustomerForm from "../../../components/CustomerForm.jsx";

// --- NEW: Time slot generator ---
function generateTimeSlots(start, end, duration = 60) {
  const slots = [];
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let current = new Date();
  current.setHours(startH, startM, 0, 0);

  const endTime = new Date();
  endTime.setHours(endH, endM, 0, 0);

  while (current < endTime) {
    const timeStr = current.toTimeString().slice(0, 5);
    slots.push(timeStr);
    current = new Date(current.getTime() + duration * 60000);
  }

  return slots;
}

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Simple bilingual dictionary
const t = {
  es: {
    bookingFor: "Reservando para:",
    confirmTitle: "Confirma tu cita",
    barber: "Barbero",
    service: "Servicio",
    date: "Fecha",
    time: "Hora",
    name: "Nombre",
    phone: "Teléfono",
    email: "Correo",
    notes: "Notas",
    none: "Ninguna",
    confirmButton: "Confirmar Cita",
    saving: "Guardando...",
    duplicate: "Este horario ya está reservado. Por favor elige otro horario.",
    error: "Error guardando la cita. Inténtalo de nuevo.",
    successTitle: "¡Cita confirmada! 🎉",
    successText: "Tu cita ha sido guardada correctamente.",
    backHome: "Volver al inicio",
    langLabel: "Idioma",
    langEs: "ES",
    langEn: "EN",
  },
  en: {
    bookingFor: "Booking for:",
    confirmTitle: "Confirm Your Booking",
    barber: "Barber",
    service: "Service",
    date: "Date",
    time: "Time",
    name: "Name",
    phone: "Phone",
    email: "Email",
    notes: "Notes",
    none: "None",
    confirmButton: "Confirm Booking",
    saving: "Saving...",
    duplicate: "This time slot is already booked. Please choose another time.",
    error: "Error saving appointment. Please try again.",
    successTitle: "Booking Confirmed 🎉",
    successText: "Your appointment has been saved successfully.",
    backHome: "Back to Home",
    langLabel: "Language",
    langEs: "ES",
    langEn: "EN",
  },
};

export default function BookingPage() {
  const { business } = useParams();

  const [step, setStep] = useState(1);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dashboardLink, setDashboardLink] = useState(null);
  const [lang, setLang] = useState("es");

  const tr = t[lang];

 // --- FIXED: getAvailableSlots with correct time filtering ---
async function getAvailableSlots(barber, date) {
  if (!barber || !date) return [];

  const dayOfWeek = new Date(date)
    .toLocaleString("en-US", { weekday: "long" })
    .toLowerCase();

  // 1. Load barber availability
  const { data: availability } = await supabase
    .from("barber_availability")
    .select("*")
    .eq("barber", barber)
    .eq("day_of_week", dayOfWeek)
    .single();

  if (!availability || availability.is_closed) return [];

  // 2. Generate all possible slots
  let slots = generateTimeSlots(
    availability.start_time,
    availability.end_time
  );

  // 2.5 Filter slots inside working hours (fix for 60-minute slots)
  slots = slots.filter((slot) => {
    const [slotH, slotM] = slot.split(":").map(Number);
    const [startH, startM] = availability.start_time.split(":").map(Number);
    const [endH, endM] = availability.end_time.split(":").map(Number);

    const slotTime = new Date();
    slotTime.setHours(slotH, slotM, 0, 0);

    const startTime = new Date();
    startTime.setHours(startH, startM, 0, 0);

    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);

    return slotTime >= startTime && slotTime < endTime;
  });

  // 3. Load existing appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("barber", barber)
    .eq("date", date);

  const taken = appointments?.map((a) => a.time.slice(0, 5)) || [];

  // 4. Remove taken slots
  slots = slots.filter((slot) => !taken.includes(slot));

  // 5. Remove past times if booking today
  const today = new Date().toISOString().split("T")[0];
  if (date === today) {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    slots = slots.filter((slot) => slot > currentTime);
  }

  return slots;
}

  // Load slots when date or barber changes
  useEffect(() => {
    if (selectedBarber && selectedDate) {
      getAvailableSlots(selectedBarber.name, selectedDate.toISOString().split("T")[0])
        .then(setAvailableSlots);
    }
  }, [selectedBarber, selectedDate]);

  return (
    <div className="p-6 max-w-lg mx-auto">
      {/* Language toggle */}
      <div className="flex justify-end mb-2 gap-2 items-center">
        <span className="text-sm">{tr.langLabel}:</span>
        <button
          className={`px-2 py-1 text-sm rounded ${
            lang === "es" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("es")}
        >
          {tr.langEs}
        </button>
        <button
          className={`px-2 py-1 text-sm rounded ${
            lang === "en" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("en")}
        >
          {tr.langEn}
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-4">
        {tr.bookingFor} {business}
      </h1>

      {/* STEP 1: BARBER SELECTOR */}
      {step === 1 && (
        <BarberSelector
          business={business}
          onSelect={(barber) => {
            setSelectedBarber(barber);
            setStep(2);
          }}
          lang={lang}
        />
      )}

      {/* STEP 2: SERVICE SELECTOR */}
      {step === 2 && (
        <ServiceSelector
          business={business}
          onSelect={(service) => {
            setSelectedService(service);
            setStep(3);
          }}
          lang={lang}
        />
      )}

      {/* STEP 3: DATE SELECTOR */}
      {step === 3 && (
        <DateSelector
          onSelect={(date) => {
            setSelectedDate(date);
            setStep(4);
          }}
          lang={lang}
        />
      )}

      {/* STEP 4: TIME SELECTOR (NOW REAL SLOTS) */}
      {step === 4 && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">{tr.time}</h2>

          {availableSlots.length === 0 && (
            <p className="text-gray-500 text-sm">
              {lang === "es"
                ? "No hay horarios disponibles para este día."
                : "No available time slots for this day."}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {availableSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => {
                  setSelectedTime(slot);
                  setStep(5);
                }}
                className="p-2 border rounded text-center bg-white hover:bg-black hover:text-white transition"
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 5: CUSTOMER FORM */}
{step === 5 && (
  <CustomerForm
    onSubmit={(info) => {
      setCustomerInfo(info);
      setStep(6);
    }}
    lang={lang}
  />
)}

     {/* STEP 6: CONFIRMATION */}
     {step === 6 && (
    <div className="mt-6 p-4 border rounded-xl bg-white shadow-sm">
    <h2 className="text-xl font-semibold mb-4">{tr.confirmTitle}</h2>

    <p><strong>{tr.barber}:</strong> {selectedBarber?.name}</p>
    <p><strong>{tr.service}:</strong> {selectedService?.name}</p>
    <p><strong>{tr.date}:</strong> {selectedDate?.toLocaleDateString()}</p>
    <p><strong>{tr.time}:</strong> {selectedTime}</p>

    <p className="mt-4"><strong>{tr.name}:</strong> {customerInfo?.name}</p>
    <p><strong>{tr.phone}:</strong> {customerInfo?.phone}</p>
    <p><strong>{tr.email}:</strong> {customerInfo?.email || "N/A"}</p>
    <p><strong>{tr.notes}:</strong> {customerInfo?.notes || tr.none}</p>

    <button
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              business,
              barber: selectedBarber.name,
              service: selectedService.name,
              date: selectedDate.toISOString().split("T")[0],
              time: selectedTime,
              customer_name: customerInfo.name,
              customer_email: customerInfo.email,
              customer_phone: customerInfo.phone,
              notes: customerInfo.notes || "",
            }),
          });

          const data = await res.json();

          if (data.success) {
            setDashboardLink(data.dashboardLink);
            setStep(7);
          } else {
            alert(tr.error);
          }
        } catch (err) {
          console.error("BOOKING ERROR:", err);
          alert(tr.error);
        }
        setLoading(false);
      }}
      className={`mt-4 w-full bg-green-600 text-white py-3 rounded-xl ${
        loading ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {loading ? tr.saving : tr.confirmButton}
    </button>
  </div>
)}

      {/* STEP 7: SUCCESS SCREEN */}
{step === 7 && (
  <div className="mt-6 p-4 border rounded-xl bg-white shadow-sm text-center">
    <h2 className="text-2xl font-bold mb-4">{tr.successTitle}</h2>
    <p>{tr.successText}</p>

    <p className="mt-4"><strong>{tr.barber}:</strong> {selectedBarber?.name}</p>
    <p><strong>{tr.service}:</strong> {selectedService?.name}</p>
    <p><strong>{tr.date}:</strong> {selectedDate?.toLocaleDateString()}</p>
    <p><strong>{tr.time}:</strong> {selectedTime}</p>

    <p className="mt-4"><strong>{tr.name}:</strong> {customerInfo?.name}</p>
    <p><strong>{tr.phone}:</strong> {customerInfo?.phone}</p>

    {/* ⭐ NEW: Show customer dashboard link */}
    {dashboardLink && (
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <p className="font-semibold mb-1">
          {lang === "es"
            ? "Administra tu cita aquí:"
            : "Manage your appointment here:"}
        </p>

        <p className="text-blue-600 underline break-all">
          {dashboardLink}
        </p>

        <button
          className="mt-3 px-4 py-2 bg-black text-white rounded"
          onClick={() => navigator.clipboard.writeText(dashboardLink)}
        >
          {lang === "es" ? "Copiar enlace" : "Copy Link"}
        </button>
      </div>
    )}

    <button
      className="mt-6 w-full bg-black text-white py-3 rounded-xl"
      onClick={() => (window.location.href = "/")}
    >
      {tr.backHome}
    </button>
  </div>
)}
    </div>
  );
}

