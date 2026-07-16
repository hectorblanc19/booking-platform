"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BlockingPanel from "@/components/BlockingPanel";
import ServiceWorkerClient from "@/app/ServiceWorkerClient";

// Service translation dictionary
const serviceNames = {
  Haircut: { es: "Corte", en: "Haircut" },
  Beard: { es: "Barba", en: "Beard" },
  "Haircut + Beard": { es: "Corte + Barba", en: "Haircut + Beard" },
  Fade: { es: "Fade", en: "Fade" },
  Other: { es: "Otro", en: "Other" },
};

// Bilingual dictionary
const t = {
  es: {
    title: "Panel del Barbero",
    barber: "Barbero",
    uploadPhoto: "Subir Foto",
    today: "Hoy",
    tomorrow: "Mañana",
    week: "Próximos 7 Días",
    all: "Todas",
    past: "Pasadas",
    cancelled: "Canceladas",
    loading: "Cargando citas...",
    none: "No se encontraron citas.",
    date: "Fecha",
    time: "Hora",
    service: "Servicio",
    customer: "Cliente",
    phone: "Teléfono",
    email: "Correo",
    notes: "Notas",
    noNotes: "Ninguna",
    cancel: "Cancelar",
    reschedule: "Reprogramar",
    langLabel: "Idioma",
    es: "ES",
    en: "EN",
    quickActions: "Acciones Rápidas",
    blockTime: "Bloquear Horario",
    editProfile: "Editar Perfil",
    workingHours: "Horario de Trabajo",
    vacations: "Vacaciones",
    breaks: "Descansos",
    statusOnline: "En línea",
    statusOffline: "Desconectado",
    pushActive: "Notificaciones activas",
    pushInactive: "Notificaciones inactivas",
    availabilityToday: "Horario de hoy",
  },
  en: {
    title: "Barber Dashboard",
    barber: "Barber",
    uploadPhoto: "Upload Photo",
    today: "Today",
    tomorrow: "Tomorrow",
    week: "Next 7 Days",
    all: "All",
    past: "Past",
    cancelled: "Cancelled",
    loading: "Loading appointments...",
    none: "No appointments found.",
    date: "Date",
    time: "Time",
    service: "Service",
    customer: "Customer",
    phone: "Phone",
    email: "Email",
    notes: "Notes",
    noNotes: "None",
    cancel: "Cancel",
    reschedule: "Reschedule",
    langLabel: "Language",
    es: "ES",
    en: "EN",
    quickActions: "Quick Actions",
    blockTime: "Block Time",
    editProfile: "Edit Profile",
    workingHours: "Working Hours",
    vacations: "Vacation Days",
    breaks: "Breaks",
    statusOnline: "Online",
    statusOffline: "Offline",
    pushActive: "Push notifications active",
    pushInactive: "Push notifications inactive",
    availabilityToday: "Today’s availability",
  },
};

export default function BarberDashboard() {
  const { barberId } = useParams();

  const [barberData, setBarberData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [view, setView] = useState("today");
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("es");
  const [pushActive, setPushActive] = useState(true); // visual only
  const [availabilityToday, setAvailabilityToday] = useState(null);

  const tr = t[lang];

  useEffect(() => {
    loadBarber();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("appointments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => loadAppointments()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    loadAppointments();
    loadTodayAvailability();
  }, [view]);

  async function loadBarber() {
    const { data } = await supabase
      .from("barbers")
      .select("*, businesses(*)")
      .eq("id", barberId)
      .single();

    setBarberData(data);
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = `${barberId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("barber-photos")
      .upload(fileName, file);

    if (uploadError) {
      alert("Error uploading photo");
      return;
    }

    const { data: urlData } = supabase.storage
      .from("barber-photos")
      .getPublicUrl(fileName);

    await supabase
      .from("barbers")
      .update({ photo_url: urlData.publicUrl })
      .eq("id", barberId);

    loadBarber();
  }

  async function loadAppointments() {
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(today.getDate() + 1);

    const nextWeek = new Date();
    nextWeek.setHours(0, 0, 0, 0);
    nextWeek.setDate(today.getDate() + 7);

    let fromDate;
    let toDate;

    if (view === "today") {
      fromDate = today.toLocaleDateString("en-CA");
      toDate = fromDate;
    } else if (view === "tomorrow") {
      fromDate = tomorrow.toLocaleDateString("en-CA");
      toDate = fromDate;
    } else if (view === "week") {
      fromDate = today.toLocaleDateString("en-CA");
      toDate = nextWeek.toLocaleDateString("en-CA");
    } else {
      // "all", "past", "cancelled"
      fromDate = "1900-01-01";
      toDate = "2999-12-31";
    }

    let query = supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", barberId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (view === "past") {
      const todayStr = today.toLocaleDateString("en-CA");
      query = query.lt("date", todayStr);
    }

    if (view === "cancelled") {
      query = query.eq("status", "cancelled");
    }

    const { data } = await query;
    setAppointments(data || []);
    setLoading(false);
  }

  async function loadTodayAvailability() {
    const today = new Date();
    const dayOfWeek = today
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();

    const { data } = await supabase
      .from("barber_availability")
      .select("*")
      .eq("barber_id", barberId)
      .eq("day_of_week", dayOfWeek)
      .single();

    if (!data || data.is_closed) {
      setAvailabilityToday(null);
      return;
    }

    setAvailabilityToday({
      start: data.start_time.slice(0, 5),
      end: data.end_time.slice(0, 5),
    });
  }

  async function cancelAppointment(id) {
    if (!confirm(lang === "es" ? "¿Cancelar esta cita?" : "Cancel this appointment?")) return;

    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);

    loadAppointments();
  }

  function formatTime(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return date.toLocaleTimeString(lang === "es" ? "es-ES" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Top bar: language + push status */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">{tr.langLabel}:</span>
            <button
              className={`px-2 py-1 text-sm rounded ${
                lang === "es" ? "bg-black text-white" : "bg-gray-200"
              }`}
              onClick={() => setLang("es")}
            >
              {tr.es}
            </button>
            <button
              className={`px-2 py-1 text-sm rounded ${
                lang === "en" ? "bg-black text-white" : "bg-gray-200"
              }`}
              onClick={() => setLang("en")}
            >
              {tr.en}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1">
              <span className="text-lg">🔔</span>
              {pushActive ? tr.pushActive : tr.pushInactive}
            </span>
          </div>
        </div>

        {/* Push subscription */}
        <ServiceWorkerClient role="business" barber_id={barberId} />

        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-md p-5 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={barberData?.photo_url || "/default-barber.png"}
              alt="Barber Photo"
              className="w-20 h-20 rounded-full object-cover border shadow"
            />
            <div>
              <h1 className="text-2xl font-bold">
                {barberData?.name || tr.barber}
              </h1>
              <p className="text-gray-500 text-sm">
                {barberData?.businesses?.name || ""}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                  ● {tr.statusOnline}
                </span>
                {availabilityToday && (
                  <span className="text-xs text-gray-500">
                    {tr.availabilityToday}:{" "}
                    {formatTime(availabilityToday.start)} –{" "}
                    {formatTime(availabilityToday.end)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer text-sm">
              {tr.uploadPhoto}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </label>
            <button
              className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm"
              onClick={() =>
                (window.location.href = `/barber/${barberId}/edit`)
              }
            >
              ✏️ {tr.editProfile}
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">{tr.quickActions}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              className="flex items-center justify-center gap-2 bg-black text-white py-2 rounded-lg text-sm"
              onClick={() =>
                document.getElementById("block-panel")?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            >
              🕒 {tr.blockTime}
            </button>
            <button
              className="flex items-center justify-center gap-2 bg-gray-200 text-black py-2 rounded-lg text-sm"
              onClick={() =>
                (window.location.href = `/barber/${barberId}/availability`)
              }
            >
              🗓 {tr.workingHours}
            </button>
            <button
              className="flex items-center justify-center gap-2 bg-gray-200 text-black py-2 rounded-lg text-sm"
              onClick={() =>
                alert(
                  lang === "es"
                    ? "Gestión de vacaciones próximamente."
                    : "Vacation management coming soon."
                )
              }
            >
              🌴 {tr.vacations}
            </button>
            <button
              className="flex items-center justify-center gap-2 bg-gray-200 text-black py-2 rounded-lg text-sm"
              onClick={() =>
                alert(
                  lang === "es"
                    ? "Gestión de descansos próximamente."
                    : "Breaks management coming soon."
                )
              }
            >
              🍽 {tr.breaks}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { key: "today", label: tr.today },
            { key: "tomorrow", label: tr.tomorrow },
            { key: "week", label: tr.week },
            { key: "all", label: tr.all },
            { key: "past", label: tr.past },
            { key: "cancelled", label: tr.cancelled },
          ].map((f) => (
            <button
              key={f.key}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${
                view === f.key
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
              onClick={() => setView(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Appointment list */}
        <div className="bg-white rounded-2xl shadow-md p-4">
          {loading ? (
            <p className="text-sm text-gray-500">{tr.loading}</p>
          ) : appointments.length === 0 ? (
            <p className="text-sm text-gray-500">{tr.none}</p>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt) => {
                const isConfirmed = appt.status === "confirmed";
                const duration = appt.duration || 60;

                return (
                  <div
                    key={appt.id}
                    className="p-4 border rounded-xl bg-white shadow-sm flex flex-col md:flex-row md:items-start md:justify-between gap-3"
                  >
                    {/* Left: time + status */}
                    <div className="flex flex-col gap-1 min-w-[120px]">
                      <p className="text-lg font-semibold">
                        {formatTime(appt.time)}
                      </p>
                      <span className="text-xs text-gray-500">
                        {tr.date}: {appt.date}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full mt-1 w-fit">
                        {isConfirmed ? (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            {lang === "es" ? "Confirmado" : "Confirmed"}
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            {lang === "es" ? "Cancelado" : "Cancelled"}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {duration} min
                      </span>
                    </div>

                    {/* Middle: details */}
                    <div className="flex-1 text-sm">
                      <p className="text-gray-700">
                        <strong>{tr.service}:</strong>{" "}
                        {serviceNames[appt.service]?.[lang] || appt.service}
                      </p>
                      <p className="text-gray-700 mt-1">
                        <strong>{tr.customer}:</strong>{" "}
                        {appt.customer_name || "N/A"}
                      </p>
                      <p className="text-gray-700 mt-1">
                        <strong>{tr.phone}:</strong>{" "}
                        {appt.customer_phone || "N/A"}
                      </p>
                      <p className="text-gray-700 mt-1">
                        <strong>{tr.email}:</strong>{" "}
                        {appt.customer_email || "N/A"}
                      </p>
                      <p className="text-gray-700 mt-1">
                        <strong>{tr.notes}:</strong>{" "}
                        {appt.notes || tr.noNotes}
                      </p>
                    </div>

                    {/* Right: actions */}
                    <div className="flex flex-col gap-2 md:w-40">
                      {isConfirmed && (
                        <>
                          <button
                            className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                            onClick={() =>
                              (window.location.href = `/barber/${barberId}/reschedule/${appt.id}`)
                            }
                          >
                            🔄 {tr.reschedule}
                          </button>
                          <button
                            className="w-full bg-red-600 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                            onClick={() => cancelAppointment(appt.id)}
                          >
                            ❌ {tr.cancel}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Blocking panel */}
        <div id="block-panel" className="mt-8">
          <BlockingPanel barberId={barberId} lang={lang} />
        </div>
      </div>
    </div>
  );
}
