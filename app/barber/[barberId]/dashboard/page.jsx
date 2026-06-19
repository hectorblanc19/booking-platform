"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BlockingPanel from "@/components/BlockingPanel";

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
  es: {
    title: "Panel del Barbero",
    barber: "Barbero",
    uploadPhoto: "Subir Foto",
    today: "Hoy",
    tomorrow: "Mañana",
    week: "Próximos 7 Días",
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
  },
  en: {
    title: "Barber Dashboard",
    barber: "Barber",
    uploadPhoto: "Upload Photo",
    today: "Today",
    tomorrow: "Tomorrow",
    week: "Next 7 Days",
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
  },
};

export default function BarberDashboard() {
  const { barberId } = useParams();

  const [barberData, setBarberData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [view, setView] = useState("today");
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("es");

  const tr = t[lang];

  // Load barber info
  useEffect(() => {
    loadBarber();
  }, []);

  async function loadBarber() {
    const { data } = await supabase
      .from("barbers")
      .select("*")
      .eq("id", barberId)
      .single();

    setBarberData(data);
  }

  // Upload photo handler
  async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = `${barberId}-${Date.now()}.jpg`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("barber-photos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      alert("Error uploading photo");
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("barber-photos")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Save URL to database
    await supabase
      .from("barbers")
      .update({ photo_url: publicUrl })
      .eq("id", barberId);

    // Refresh UI
    loadBarber();
  }

  // Realtime updates
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
  }, [view]);

  async function loadAppointments() {
    setLoading(true);

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    let fromDate;
    let toDate;

    if (view === "today") {
      fromDate = today.toISOString().split("T")[0];
      toDate = fromDate;
    } else if (view === "tomorrow") {
      fromDate = tomorrow.toISOString().split("T")[0];
      toDate = fromDate;
    } else {
      fromDate = today.toISOString().split("T")[0];
      toDate = nextWeek.toISOString().split("T")[0];
    }

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("barber_id", barberId)
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (!error) setAppointments(data);

    setLoading(false);
  }

  async function cancelAppointment(id) {
    if (!confirm(tr.cancel)) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (!error) loadAppointments();
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-xl p-6">

        {/* Language Toggle */}
        <div className="flex justify-end mb-4 gap-2 items-center">
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

        <h1 className="text-3xl font-bold mb-2">{tr.title}</h1>
        <h2 className="text-xl mb-4">
          {tr.barber}: {barberData?.name || "..."}
        </h2>

        {/* ⭐ Barber Photo + Upload Button */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={barberData?.photo_url || "/default-barber.png"}
            alt="Barber Photo"
            className="w-28 h-28 rounded-full object-cover border shadow"
          />

          <label className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer">
            {tr.uploadPhoto}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        </div>

        {/* FILTER BUTTONS */}
        <div className="flex gap-3 mb-6">
          <button
            className={`px-4 py-2 rounded ${
              view === "today" ? "bg-black text-white" : "bg-gray-200"
            }`}
            onClick={() => setView("today")}
          >
            {tr.today}
          </button>

          <button
            className={`px-4 py-2 rounded ${
              view === "tomorrow" ? "bg-black text-white" : "bg-gray-200"
            }`}
            onClick={() => setView("tomorrow")}
          >
            {tr.tomorrow}
          </button>

          <button
            className={`px-4 py-2 rounded ${
              view === "week" ? "bg-black text-white" : "bg-gray-200"
            }`}
            onClick={() => setView("week")}
          >
            {tr.week}
          </button>
        </div>

        {loading ? (
          <p>{tr.loading}</p>
        ) : appointments.length === 0 ? (
          <p>{tr.none}</p>
        ) : (
          <div className="space-y-4">

            {appointments.map((appt) => (
              <div key={appt.id} className="p-4 border rounded-xl bg-white shadow-sm">

                <p className="text-gray-700 text-sm">
                  <strong>{tr.date}:</strong> {appt.date}
                </p>

                <p className="text-gray-700 text-sm">
                  <strong>{tr.time}:</strong> {appt.time}
                </p>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-green-600 text-lg">✔</span>
                  <span className="font-semibold text-green-700 text-sm">
                    {lang === "es" ? "Confirmado" : "Confirmed"}
                  </span>
                </div>

                <p className="mt-2 text-sm">
                  <strong>{tr.service}:</strong>{" "}
                  {serviceNames[appt.service]?.[lang] || appt.service}
                </p>

                <hr className="my-3" />

                <p className="text-sm"><strong>{tr.customer}:</strong> {appt.customer_name}</p>
                <p className="text-sm"><strong>{tr.phone}:</strong> {appt.customer_phone}</p>
                <p className="text-sm"><strong>{tr.email}:</strong> {appt.customer_email || "N/A"}</p>
                <p className="text-sm"><strong>{tr.notes}:</strong> {appt.notes || tr.noNotes}</p>

                <div className="mt-4 flex gap-2">

                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold"
                    onClick={() => cancelAppointment(appt.id)}
                  >
                    ❌ {tr.cancel}
                  </button>

                  <button
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold"
                    onClick={() =>
                      (window.location.href = `/barber/${barberId}/reschedule/${appt.id}`)
                    }
                  >
                    🔄 {tr.reschedule}
                  </button>

                </div>

              </div>
            ))}
          </div>
        )}

        <BlockingPanel barber={barberId} lang={lang} />
      </div>
    </div>
  );
}
