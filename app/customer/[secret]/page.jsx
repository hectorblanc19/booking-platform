"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Service translation dictionary
const serviceNames = {
  "Haircut": { es: "Corte", en: "Haircut" },
  "Beard": { es: "Barba", en: "Beard" },
  "Haircut + Beard": { es: "Corte + Barba", en: "Haircut + Beard" },
  "Fade": { es: "Fade", en: "Fade" },
  "Other": { es: "Otro", en: "Other" },
};

// Bilingual dictionary
const t = {
  en: {
    title: "Your Appointment",
    barber: "Barber",
    business: "Business",
    date: "Date",
    time: "Time",
    name: "Your Name",
    phone: "Phone",
    email: "Email",
    status: "Status",
    notes: "Notes",
    none: "None",
    cancel: "Cancel",
    reschedule: "Reschedule",
    lang: "Language",
  },
  es: {
    title: "Tu Cita",
    barber: "Barbero",
    business: "Negocio",
    date: "Fecha",
    time: "Hora",
    name: "Tu Nombre",
    phone: "Teléfono",
    email: "Correo",
    status: "Estado",
    notes: "Notas",
    none: "Ninguna",
    cancel: "Cancelar",
    reschedule: "Reprogramar",
    lang: "Idioma",
  },
};

export default function CustomerSecretPage() {
  const { secret } = useParams();
  const router = useRouter();

  const [lang, setLang] = useState("es");
  const tr = t[lang];

  const [appointment, setAppointment] = useState(null);
  const [barber, setBarber] = useState(null);
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    loadAppointment();
  }, []);

  async function loadAppointment() {
    // ✔ FIXED: Search by UUID only
    const { data: appt } = await supabase
      .from("appointments")
      .select("*")
      .eq("secret_link", secret)
      .single();

    // ❗ FIX: Handle not found
    if (!appt) {
      setAppointment("not-found");
      return;
    }

    setAppointment(appt);

    const { data: barberData } = await supabase
      .from("barbers")
      .select("*")
      .eq("id", appt.barber_id)
      .single();

    setBarber(barberData);

    const { data: businessData } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", appt.business_id)
      .single();

    setBusiness(businessData);
  }

  async function cancelAppointment() {
    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", appointment.id);

    alert(lang === "es" ? "Cita cancelada" : "Appointment cancelled");
    loadAppointment();
  }

  function shareWhatsApp() {
    const message =
      `${lang === "es" ? "¡Mi cita está confirmada!" : "My appointment is confirmed!"}\n\n` +
      `${tr.service}: ${serviceNames[appointment.service]?.[lang] || appointment.service}\n` +
      `${tr.barber}: ${barber?.name}\n` +
      `${tr.business}: ${business?.name}\n` +
      `${tr.date}: ${appointment.date}\n` +
      `${tr.time}: ${appointment.time}\n\n` +
      `${lang === "es" ? "Ver detalles:" : "View details:"} ` +
      `${window.location.href}`;

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  // ⭐ FIX: Handle not found
  if (appointment === "not-found") {
    return (
      <p className="p-6 text-red-600 text-center text-lg">
        {lang === "es" ? "Cita no encontrada." : "Appointment not found."}
      </p>
    );
  }

  if (!appointment) return <p className="p-6">Loading...</p>;

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

      <h1 className="text-2xl font-bold mb-4">{tr.title}</h1>

      {/* STATUS MESSAGE */}
      <div className="text-center mb-6">
        {appointment.status === "confirmed" ? (
          <>
            <div className="text-green-600 text-5xl mb-2">✔</div>
            <h2 className="text-2xl font-bold">
              {lang === "es" ? "¡Cita Confirmada!" : "Appointment Confirmed!"}
            </h2>
          </>
        ) : (
          <>
            <div className="text-red-600 text-5xl mb-2">✖</div>
            <h2 className="text-2xl font-bold">
              {lang === "es" ? "Cita Cancelada" : "Appointment Cancelled"}
            </h2>
          </>
        )}

        <button
          className="mt-4 bg-black text-white px-5 py-3 rounded-xl w-full"
          onClick={() => (window.location.href = "/")}
        >
          {lang === "es" ? "Volver al Inicio" : "Back Home"}
        </button>

        {appointment.status === "confirmed" && (
          <button
            className="mt-3 bg-green-600 text-white px-5 py-3 rounded-xl w-full"
            onClick={shareWhatsApp}
          >
            {lang === "es" ? "Compartir por WhatsApp" : "Share via WhatsApp"}
          </button>
        )}
      </div>

      {/* CARD */}
      <div className="p-5 border rounded-xl bg-white shadow-md">

        <p className="text-lg font-semibold mb-2">
          {serviceNames[appointment.service]?.[lang] || appointment.service}
        </p>

        <p className="text-sm"><strong>{tr.barber}:</strong> {barber?.name}</p>
        <p className="text-sm"><strong>{tr.business}:</strong> {business?.name}</p>

        <p className="text-sm mt-2"><strong>{tr.date}:</strong> {appointment.date}</p>
        <p className="text-sm"><strong>{tr.time}:</strong> {appointment.time}</p>

        <p className="text-sm mt-2"><strong>{tr.name}:</strong> {appointment.customer_name}</p>
        <p className="text-sm"><strong>{tr.phone}:</strong> {appointment.customer_phone}</p>
        <p className="text-sm"><strong>{tr.email}:</strong> {appointment.customer_email}</p>

        {/* STATUS */}
        <div className="flex items-center gap-2 mt-3">
          {appointment.status === "confirmed" ? (
            <>
              <span className="text-green-600 text-lg">✔</span>
              <span className="font-semibold text-green-700 text-sm">
                {lang === "es" ? "Confirmado" : "Confirmed"}
              </span>
            </>
          ) : (
            <>
              <span className="text-red-600 text-lg">✖</span>
              <span className="font-semibold text-red-700 text-sm">
                {lang === "es" ? "Cancelado" : "Cancelled"}
              </span>
            </>
          )}
        </div>

        <p className="text-sm mt-3">
          <strong>{tr.notes}:</strong> {appointment.notes || tr.none}
        </p>
      </div>

      {/* BUTTONS */}
      {appointment.status === "confirmed" && (
        <>
          <button
            className="mt-4 w-full bg-red-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            onClick={cancelAppointment}
          >
            ❌ {tr.cancel}
          </button>

          <button
            className="mt-3 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
            onClick={() => router.push(`/customer/reschedule?secret=${secret}`)}
          >
            🔄 {tr.reschedule}
          </button>
        </>
      )}
    </div>
  );
}
