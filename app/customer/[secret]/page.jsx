"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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
    cancel: "Cancel Appointment",
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
    cancel: "Cancelar Cita",
    reschedule: "Reprogramar",
    lang: "Idioma",
  },
};

export default function CustomerSecretPage() {
  const { secret } = useParams();
  const router = useRouter();

  const [lang, setLang] = useState("en");
  const tr = t[lang];

  const [appointment, setAppointment] = useState(null);
  const [barber, setBarber] = useState(null);
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    loadAppointment();
  }, []);

  async function loadAppointment() {
    const { data: appt, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("secret_link", secret)
      .single();

    if (error || !appt) return;

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

    alert(lang === "en" ? "Appointment cancelled" : "Cita cancelada");
    loadAppointment();
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

      <div className="border p-4 rounded-xl shadow-sm bg-white">
        <p className="text-lg font-semibold mb-2">
          {serviceEmoji(appointment.service)} {appointment.service}
        </p>

        <p><strong>{tr.barber}:</strong> {barber?.name}</p>
        <p><strong>{tr.business}:</strong> {business?.name}</p>

        <p><strong>{tr.date}:</strong> {appointment.date}</p>
        <p><strong>{tr.time}:</strong> {appointment.time}</p>

        <p><strong>{tr.name}:</strong> {appointment.customer_name}</p>
        <p><strong>{tr.phone}:</strong> {appointment.customer_phone}</p>
        <p><strong>{tr.email}:</strong> {appointment.customer_email}</p>

        <p className="mt-2">
          <strong>{tr.status}:</strong>{" "}
          <span className={`px-3 py-1 rounded-lg text-white ${statusColor(appointment.status)}`}>
            {appointment.status}
          </span>
        </p>

        <p className="mt-2">
          <strong>{tr.notes}:</strong> {appointment.notes || tr.none}
        </p>
      </div>

      <button
        className="mt-4 w-full bg-red-600 text-white py-3 rounded-xl"
        onClick={cancelAppointment}
      >
        {tr.cancel}
      </button>

      <button
        className="mt-3 w-full bg-blue-600 text-white py-3 rounded-xl"
        onClick={() => router.push(`/customer/reschedule?secret=${secret}`)}
      >
        {tr.reschedule}
      </button>
    </div>
  );
}

function statusColor(status) {
  switch (status) {
    case "confirmed":
      return "bg-green-600";
    case "cancelled":
      return "bg-red-600";
    default:
      return "bg-gray-500";
  }
}

function serviceEmoji(service) {
  if (!service) return "💈";
  service = service.toLowerCase();

  if (service.includes("hair")) return "💇‍♂️";
  if (service.includes("beard")) return "🧔";
  if (service.includes("fade")) return "✂️";

  return "💈";
}
