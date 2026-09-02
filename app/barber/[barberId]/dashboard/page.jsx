"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BlockingPanel from "@/components/BlockingPanel";
import ServiceWorkerClient from "@/app/ServiceWorkerClient";
import CustomerHistory from "@/components/CustomerHistory";

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

/* ⭐ WEEKLY AVAILABILITY COMPONENT — INSERTED HERE */
function WeeklyAvailability({ barberId, lang }) {
  const [week, setWeek] = useState([]);

  useEffect(() => {
    async function loadWeek() {
      const { data } = await supabase
        .from("barber_availability")
        .select("*")
        .eq("barber_id", barberId)
        .order("day_of_week", { ascending: true });

      setWeek(data || []);
    }

    loadWeek();
  }, [barberId]);

  const dayNames = {
    monday: lang === "es" ? "Lunes" : "Monday",
    tuesday: lang === "es" ? "Martes" : "Tuesday",
    wednesday: lang === "es" ? "Miércoles" : "Wednesday",
    thursday: lang === "es" ? "Jueves" : "Thursday",
    friday: lang === "es" ? "Viernes" : "Friday",
    saturday: lang === "es" ? "Sábado" : "Saturday",
    sunday: lang === "es" ? "Domingo" : "Sunday",
  };

  return (
    <div className="space-y-2">
      {week.map((row) => (
        <div
          key={row.day_of_week}
          className="flex justify-between border-b pb-2"
        >
          <span className="font-semibold">{dayNames[row.day_of_week]}</span>

          {row.is_closed ? (
            <span className="text-red-600">
              {lang === "es" ? "Cerrado" : "Closed"}
            </span>
          ) : (
            <span className="text-gray-700">
              {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function BarberDashboard() {
  const { barberId } = useParams();

  const [lang, setLang] = useState("es");   // MUST COME FIRST

  /* ⭐ QR CODE LOGIC — NOW SAFE */
  const qrLink = `https://www.flowpaydr.com/barbers/${barberId}?lang=${lang}`;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrLink}`;

  const [barberData, setBarberData] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [customerHistoryRefresh, setCustomerHistoryRefresh] = useState(0);
  const [view, setView] = useState("today");
  const [loading, setLoading] = useState(true);
  const [pushActive, setPushActive] = useState(true);
  const [availabilityToday, setAvailabilityToday] = useState(null);

  // ⭐ Gallery state
  const [gallery, setGallery] = useState([]);

  // ⭐ PRICE FIELDS (NEW — REQUIRED)
  const [haircutPrice, setHaircutPrice] = useState("");
  const [beardPrice, setBeardPrice] = useState("");
  const [comboPrice, setComboPrice] = useState("");

  const tr = t[lang];

  // ⭐ Load barber + gallery on page load
  useEffect(() => {
    loadBarber();
    loadGallery();   // ⭐ REQUIRED
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

// ⭐ Refresh today's availability whenever dashboard is opened
useEffect(() => {
  loadTodayAvailability();
}, [barberId]);

// ⭐ Refresh when window regains focus
useEffect(() => {
  function handleFocus() {
    loadTodayAvailability();
  }

  window.addEventListener("focus", handleFocus);
  return () => window.removeEventListener("focus", handleFocus);
}, []);


  useEffect(() => {
    loadAppointments();
    loadTodayAvailability();
  }, [view]);

  // ⭐ Load barber profile
async function loadBarber() {
  const { data, error } = await supabase
    .from("barbers")
    .select(`*, businesses(*)`)
    .eq("id", barberId)
    .single();

  if (error) console.error("Error loading barber:", error);

  setBarberData(data);

  // ⭐ Load prices (NEW)
  setHaircutPrice(data.haircut_price || "");
  setBeardPrice(data.beard_price || "");
  setComboPrice(data.combo_price || "");
}

  // ⭐ Load gallery photos
async function loadGallery() {
  const { data, error } = await supabase
    .from("barber_gallery")
    .select("*")
    .eq("barber_id", barberId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading gallery:", error);
    return;
  }

  setGallery(data || []);
}

// ⭐ Compress image BEFORE uploading (iPhone fix)
async function compressImage(file, maxWidth = 1200) {
  const imageBitmap = await createImageBitmap(file);

  const ratio = imageBitmap.width / imageBitmap.height;
  const newWidth = Math.min(imageBitmap.width, maxWidth);
  const newHeight = newWidth / ratio;

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

  const compressedBlob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.8)
  );

  return new File([compressedBlob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

// ⭐ PLACE convertToJpeg() RIGHT HERE
async function convertToJpeg(file) {
  // If it's not HEIC, return original file
  if (
    !file.type.includes("heic") &&
    !file.name.toLowerCase().includes("heic")
  ) {
    return file;
  }

  // Convert HEIC → JPEG using canvas
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer]);

  const imageBitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0);

  const jpegBlob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  );

  return new File([jpegBlob], file.name.replace(/\.heic/i, ".jpg"), {
    type: "image/jpeg",
  });
}

// ⭐ Upload profile photo
async function handlePhotoUpload(event) {
  let file = event.target.files[0];
  if (!file) return;

  // ⭐ Convert HEIC → JPEG
  file = await convertToJpeg(file);

  // ⭐ Compress image (iPhone fix)
  file = await compressImage(file);

  // ⭐ Correct extension
  const ext = file.name.split(".").pop();

  // ⭐ Correct filename for PROFILE photo
  const fileName = `${barberId}-profile-${Date.now()}.${ext}`;

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

// ⭐ Upload gallery photo
async function handleGalleryUpload(event) {
  let file = event.target.files[0];
  if (!file) return;

  // ⭐ Convert HEIC → JPEG
  file = await convertToJpeg(file);

  // ⭐ Compress image (iPhone fix)
  file = await compressImage(file);

  // ⭐ Limit to 4 photos
  if (gallery.length >= 4) {
    alert(lang === "es"
      ? "Solo puedes subir 4 fotos a la galería."
      : "You can only upload 4 gallery photos.");
    return;
  }

  // ⭐ Correct extension
  const ext = file.name.split(".").pop();

  // ⭐ Correct filename for GALLERY photo
  const fileName = `${barberId}-gallery-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("barber-gallery")
    .upload(fileName, file);

  if (uploadError) {
    alert("Error uploading gallery photo");
    return;
  }

  const { data: urlData } = supabase.storage
    .from("barber-gallery")
    .getPublicUrl(fileName);

  await fetch("/api/gallery/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      barber_id: barberId,
      photo_url: urlData.publicUrl,
    }),
  });

  loadGallery();
}
// ⭐ DELETE GALLERY PHOTO — PLACE IT HERE
async function deleteGalleryPhoto(photoId) {
  if (!confirm(lang === "es"
    ? "¿Eliminar esta foto?"
    : "Delete this photo?")) return;

  await fetch("/api/gallery/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: photoId }),
  });

  loadGallery();
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

  // ⭐ Always return english day names
  const dayOfWeek = new Intl.DateTimeFormat("en-US", { weekday: "long" })
    .format(today)
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

async function markAppointmentCompleted(id) {
  if (
    !confirm(
      lang === "es"
        ? "¿Marcar esta cita como completada?"
        : "Mark this appointment as completed?"
    )
  ) {
    return;
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "completed",
    })
    .eq("id", id);

  if (error) {
    console.error("Complete appointment error:", error);

    alert(
      lang === "es"
        ? "No se pudo marcar la cita como completada."
        : "Could not mark appointment as completed."
    );

    return;
  }

  loadAppointments();
  setCustomerHistoryRefresh((value) => value + 1);
}

async function markAppointmentNoShow(id) {
  if (
    !confirm(
      lang === "es"
        ? "¿Marcar esta cita como 'No asistió'?"
        : "Mark this appointment as 'No-show'?"
    )
  ) {
    return;
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "no_show",
    })
    .eq("id", id);

  if (error) {
    console.error("No-show appointment error:", error);

    alert(
      lang === "es"
        ? "No se pudo marcar la cita como no asistió."
        : "Could not mark appointment as no-show."
    );

    return;
  }

  loadAppointments();
  setCustomerHistoryRefresh((value) => value + 1);
}
function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);

  return date.toLocaleTimeString(
    lang === "es" ? "es-ES" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
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

// ⭐ LOGOUT FUNCTION
async function handleLogout() {
  await supabase.auth.signOut();
  window.location.href = "/barber/login";
}

// ⭐ DELETE ACCOUNT FUNCTION
async function handleDeleteAccount() {
  const confirmDelete = confirm(
    lang === "es"
      ? "¿Seguro que deseas eliminar tu cuenta? Esto no se puede deshacer."
      : "Are you sure you want to delete your account? This cannot be undone."
  );

  if (!confirmDelete) return;

  await fetch("/api/barber/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ barberId }),
  });

  await supabase.auth.signOut();
  window.location.href = "/barber/login";
}

// ⭐ SAVE PRICES FUNCTION (INSERTED HERE)
async function savePrices() {
  const { error } = await supabase
    .from("barbers")
    .update({
      haircut_price: haircutPrice,
      beard_price: beardPrice,
      combo_price: comboPrice,
    })
    .eq("id", barberId);

  if (error) {
    alert(lang === "es" ? "Error guardando precios" : "Error saving prices");
    return;
  }

  alert(lang === "es" ? "Precios actualizados" : "Prices updated");
  loadBarber();
}

// ⭐ EARLY RETURN — stop dashboard completely
if (barberData?.payment_status === "unpaid") {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mt-6 p-6 bg-white rounded-xl shadow text-center">
          <h1 className="text-2xl font-bold text-red-600">
            Barber Unavailable
          </h1>
          <p className="text-gray-600 mt-2">
            This barber is currently blocked by the administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

return (
  <div className="min-h-screen bg-gray-100 py-8">
    <div className="max-w-4xl mx-auto px-4">

      {/* Top bar */}
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

  {/* ⭐ Logout button */}
  <button
    onClick={handleLogout}
    className="px-3 py-1 bg-red-600 text-white rounded text-sm"
  >
    {lang === "es" ? "Cerrar Sesión" : "Logout"}
  </button>
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

  <div className="flex flex-col items-center gap-3 w-full md:w-auto">
    {/* Upload Profile Photo */}
    <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer text-sm w-full text-center">
      {tr.uploadPhoto}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />
    </label>

    {/* Upload Gallery Photo */}
    <label className="bg-purple-600 text-white px-4 py-2 rounded-lg cursor-pointer text-sm w-full text-center">
      {lang === "es" ? "Subir Foto a Galería" : "Upload Gallery Photo"}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryUpload}
      />
    </label>

    {/* Edit Profile */}
    <button
      className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm w-full"
      onClick={() =>
        (window.location.href = `/barber/${barberId}/edit`)
      }
    >
      ✏️ {tr.editProfile}
    </button>

    {/* Public profile + booking links */}
    <a
      href={`/barbers/${barberId}?lang=${lang}`}
      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm text-center w-full"
    >
      {lang === "es" ? "Ver Perfil Público" : "View Public Profile"}
    </a>

    <a
      href={`/booking/${barberId}?lang=${lang}`}
      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm text-center w-full"
    >
      {lang === "es" ? "Ver Página de Reservas" : "View Booking Page"}
    </a>
  </div>
</div>

{/* ⭐ QR CODE SECTION */}
<div className="bg-white rounded-2xl shadow-md p-5 mb-6 text-center">

  <img
    src={qrImage}
    alt="QR Code"
    className="w-40 h-40 mx-auto mb-3"
  />

  <p className="text-gray-600 mb-2">
    {lang === "es"
      ? "Comparte este QR para que los clientes vean tu perfil público."
      : "Share this QR so clients can access your public profile."}
  </p>

  <p className="text-gray-400 text-xs mb-3">
    {lang === "es"
      ? "Mantén presionada la imagen 3 segundos para copiar, guardar o compartir."
      : "Hold the image for 3 seconds to copy, save, or share."}
  </p>

  <button
    onClick={() => {
      const link = document.createElement("a");
      link.href = qrImage;
      link.download = `barber-${barberId}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }}
    className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
  >
    {lang === "es" ? "Descargar QR" : "Download QR"}
  </button>
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

    {/* ⭐ DELETE ACCOUNT BUTTON */}
    <button
      className="flex items-center justify-center gap-2 bg-red-700 text-white py-2 rounded-lg text-sm"
      onClick={handleDeleteAccount}
    >
      🗑 {lang === "es" ? "Eliminar Cuenta" : "Delete Account"}
    </button>

</div>
</div>

{/* ⭐ Services & Prices */}
<div className="bg-white rounded-2xl shadow-md p-4 mb-6">
  <h3 className="text-lg font-semibold mb-3">
    {lang === "es" ? "Servicios y Precios" : "Services & Prices"}
  </h3>

  <div className="space-y-4">

    {/* Haircut Price */}
    <div>
      <label className="block text-sm font-medium mb-1">
        {lang === "es" ? "Precio de Corte" : "Haircut Price"}
      </label>
      <input
        type="number"
        value={haircutPrice}
        onChange={(e) => setHaircutPrice(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        placeholder={lang === "es" ? "Ej: 20" : "Ex: 20"}
      />
    </div>

    {/* Beard Price */}
    <div>
      <label className="block text-sm font-medium mb-1">
        {lang === "es" ? "Precio de Barba" : "Beard Price"}
      </label>
      <input
        type="number"
        value={beardPrice}
        onChange={(e) => setBeardPrice(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        placeholder={lang === "es" ? "Ej: 15" : "Ex: 15"}
      />
    </div>

    {/* Haircut + Beard Price */}
    <div>
      <label className="block text-sm font-medium mb-1">
        {lang === "es" ? "Corte + Barba" : "Haircut + Beard"}
      </label>
      <input
        type="number"
        value={comboPrice}
        onChange={(e) => setComboPrice(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
        placeholder={lang === "es" ? "Ej: 30" : "Ex: 30"}
      />
    </div>

    {/* Save Button */}
    <button
      onClick={savePrices}
      className="w-full bg-green-600 text-white py-2 rounded-lg text-sm mt-2"
    >
      {lang === "es" ? "Guardar Precios" : "Save Prices"}
    </button>
  </div>
</div>
<CustomerHistory barberId={barberId} lang={lang} />

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
      <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
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
  {appt.status === "confirmed" ? (
    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
      {lang === "es" ? "Confirmado" : "Confirmed"}
    </span>
  ) : appt.status === "completed" ? (
    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
      {lang === "es" ? "Completada" : "Completed"}
    </span>
  ) : appt.status === "no_show" ? (
    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
      {lang === "es" ? "No asistió" : "No-show"}
    </span>
  ) : (
    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">
      {lang === "es" ? "Cancelado" : "Cancelled"}
    </span>
  )}
</span>                    <span className="text-xs text-gray-500 mt-1">
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
                      <a
                        href={`https://wa.me/${appt.customer_phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 underline flex items-center gap-1"
                      >
                        <span>💬</span> {appt.customer_phone}
                      </a>
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
    {new Date(`${appt.date}T${appt.time}`) > new Date() ? (
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
    ) : (
      <>
        <button
          className="w-full bg-blue-600 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
          onClick={() => markAppointmentCompleted(appt.id)}
        >
          ✅ {lang === "es" ? "Completada" : "Completed"}
        </button>

        <button
          className="w-full bg-orange-500 text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
          onClick={() => markAppointmentNoShow(appt.id)}
        >
          🚫 {lang === "es" ? "No asistió" : "No-show"}
        </button>
      </>
    )}
  </>
)}                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ⭐ Gallery Preview */}
<div className="bg-white rounded-2xl shadow-md p-4 mb-6">
  <h3 className="text-lg font-semibold mb-3">
    {lang === "es" ? "Galería de Fotos" : "Photo Gallery"}
  </h3>

  {/* ⭐ Limit message */}
  {gallery.length >= 4 && (
    <p className="text-xs text-red-600 mb-2">
      {lang === "es"
        ? "Límite alcanzado: máximo 4 fotos."
        : "Limit reached: maximum 4 photos."}
    </p>
  )}

  {gallery.length === 0 ? (
    <p className="text-sm text-gray-500">
      {lang === "es"
        ? "No hay fotos en la galería."
        : "No gallery photos yet."}
    </p>
  ) : (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {gallery.map((photo) => (
        <div key={photo.id} className="relative">
          <img
            src={photo.photo_url}
            alt="Gallery"
            className="w-full h-32 object-cover rounded-lg shadow"
          />

          {/* ⭐ Delete button */}
          <button
            onClick={() => deleteGalleryPhoto(photo.id)}
            className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded shadow"
          >
            ✖
          </button>
        </div>
      ))}
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
