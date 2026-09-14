"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProviderList from "@/components/business/ProviderList";
import ProviderAvailability from "@/components/business/ProviderAvailability";
import BusinessServices from "@/components/business/BusinessServices";
import ManualAppointment from "@/components/business/ManualAppointment";
import BusinessQRCode from "@/components/business/BusinessQRCode";
import TodaysSchedule from "@/components/business/TodaysSchedule";
import CustomerList from "@/components/business/CustomerList";
import CalendarView from "@/components/business/CalendarView";
import AllAppointments from "@/components/business/AllAppointments";
import BarberManagement from "@/components/business/BarberManagement";

/* ⭐ ADD THIS BLOCK RIGHT HERE */
const serviceLabels = {
  es: ["Corte", "Barba", "Color", "Niños", "Cejas", "Afeitado", "Diseño", "Blowout", "Shape Up"],
  en: ["Haircut", "Beard", "Color", "Kids", "Eyebrows", "Shave", "Design", "Blowout", "Shape Up"]
};

const dayLabels = {
  es: ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"],
  en: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
};
/* ⭐ END OF BLOCK */

export default function BusinessDashboard() {
  const { businessId } = useParams();

 const [lang, setLang] = useState("en");
const [business, setBusiness] = useState(null);
const [barbers, setBarbers] = useState([]);
const [providers, setProviders] = useState([]);
const [services, setServices] = useState([]);
const [appointments, setAppointments] = useState([]);
const [customers, setCustomers] = useState([]);
const [loading, setLoading] = useState(true);

// BUSINESS PHOTO
const [uploadingBusinessPhoto, setUploadingBusinessPhoto] = useState(false);
const [businessPhotoPreview, setBusinessPhotoPreview] = useState(null);

// BUSINESS GOOGLE MAPS PIN
const [businessMapUrl, setBusinessMapUrl] = useState("");
const [savingBusinessMapUrl, setSavingBusinessMapUrl] = useState(false);

// Detect whether this business is a barber business
const normalizedCategory = business?.category?.trim().toLowerCase() || "";

const isBarberBusiness =
  normalizedCategory.includes("barber") ||
  normalizedCategory.includes("barbero") ||
  normalizedCategory.includes("barbería") ||
  normalizedCategory.includes("barberia");

const isTourBusiness =
  normalizedCategory.includes("tour") ||
  normalizedCategory.includes("excursion") ||
  normalizedCategory.includes("excursión");

  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberEmail, setNewBarberEmail] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [newBarberPin, setNewBarberPin] = useState("");
  const [newBarberServices, setNewBarberServices] = useState([]);
  const [newBarberDays, setNewBarberDays] = useState([]);

  // MANUAL APPOINTMENT
  const [newAppointmentName, setNewAppointmentName] = useState("");
  const [newAppointmentPhone, setNewAppointmentPhone] = useState("");
  const [newAppointmentEmail, setNewAppointmentEmail] = useState("");
  const [newAppointmentService, setNewAppointmentService] = useState("");
  const [newAppointmentDate, setNewAppointmentDate] = useState("");
  const [newAppointmentTime, setNewAppointmentTime] = useState("");
  const [newAppointmentBarberId, setNewAppointmentBarberId] = useState("");
  const [newAppointmentProviderId, setNewAppointmentProviderId] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);

  // TOUR MANUAL RESERVATION
  const [newTourGuestCount, setNewTourGuestCount] = useState("");
  const [newTourPickupLocation, setNewTourPickupLocation] = useState("");

// PROVIDER
const [newProviderName, setNewProviderName] = useState("");
const [newProviderEmail, setNewProviderEmail] = useState("");
const [newProviderPhone, setNewProviderPhone] = useState("");
const [newProviderSpecialty, setNewProviderSpecialty] = useState("");

// EDIT PROVIDER
const [editingProviderId, setEditingProviderId] = useState(null);
const [editProviderName, setEditProviderName] = useState("");
const [editProviderEmail, setEditProviderEmail] = useState("");
const [editProviderPhone, setEditProviderPhone] = useState("");
const [editProviderSpecialty, setEditProviderSpecialty] = useState("");
const [savingEditProvider, setSavingEditProvider] = useState(false);

// PROVIDER PROFILE PHOTO
const [uploadingProviderPhotoId, setUploadingProviderPhotoId] = useState(null);

// BUSINESS ACCOUNT DELETION
const [deletingBusiness, setDeletingBusiness] = useState(false);

// PROVIDER AVAILABILITY
const [providerAvailability, setProviderAvailability] = useState([]);
const [selectedAvailabilityProviderId, setSelectedAvailabilityProviderId] =
  useState("");
const [savingProviderAvailability, setSavingProviderAvailability] =
  useState(false);

// BUSINESS SERVICES
const [newServiceName, setNewServiceName] = useState("");
const [newServiceDescription, setNewServiceDescription] = useState("");
const [newServicePrice, setNewServicePrice] = useState("");
const [newServiceDuration, setNewServiceDuration] = useState("30");
const [newServiceProviderId, setNewServiceProviderId] = useState("");
const [savingService, setSavingService] = useState(false);

// EDIT SERVICE
const [editingServiceId, setEditingServiceId] = useState(null);
const [editServiceName, setEditServiceName] = useState("");
const [editServiceDescription, setEditServiceDescription] = useState("");
const [editServicePrice, setEditServicePrice] = useState("");
const [editServiceDuration, setEditServiceDuration] = useState("");
const [editServiceProviderId, setEditServiceProviderId] = useState("");
const [savingEditService, setSavingEditService] = useState(false);

// TOUR SERVICE SCHEDULE SETTINGS
const [editingTourServiceId, setEditingTourServiceId] = useState(null);
const [tourDepartureTimes, setTourDepartureTimes] = useState([]);
const [newTourDepartureTime, setNewTourDepartureTime] = useState("");
const [tourMaxGuests, setTourMaxGuests] = useState("");
const [savingTourSettings, setSavingTourSettings] = useState(false);
 
 // TOAST
  const [toast, setToast] = useState(null);
  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  // BUSINESS OWNER AUTHENTICATION
const [accessGranted, setAccessGranted] = useState(false);
const [checkingAuth, setCheckingAuth] = useState(true);

useEffect(() => {
  checkBusinessOwner();
}, []);

async function checkBusinessOwner() {
  setCheckingAuth(true);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    setAccessGranted(false);
    setCheckingAuth(false);
    return;
  }

  const { data: biz, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (businessError || !biz) {
    setAccessGranted(false);
    setCheckingAuth(false);
    return;
  }

  setAccessGranted(true);
  setCheckingAuth(false);

  await loadDashboard();
}
  /* ⭐ NEW STATE FOR FILTERS + GROUPING + PAGINATION ⭐ */
  const [filterBarberId, setFilterBarberId] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");

  // pagination per barber
  const [pageByBarber, setPageByBarber] = useState({});

  // collapsible sections per barber
  const [openBarbers, setOpenBarbers] = useState({});

  const t = {
    en: {
      dashboard: "Business Dashboard",
      barbers: "Barbers",
      addBarber: "Add Barber",
      barberName: "Barber name",
      barberEmail: "Barber email",
      delete: "Delete",
      todaysSchedule: "Today’s Schedule",
      noAppointmentsToday: "No appointments today.",
      calendarView: "Calendar View",
      customerList: "Customer List",
      allAppointments: "All Appointments",
      appointments: "appointments",
      last: "Last",
      prev: "Previous",
      next: "Next",
      businessInfo: "Business Info",
      bookingLink: "Booking Link",
      copyLink: "Copy Link",
      qrCode: "QR Code",
      copied: "Link copied!",

      // MANUAL APPOINTMENT
addAppointment: "Add Appointment",
customerName: "Customer name",
customerPhone: "WhatsApp / Phone",
customerEmail: "Customer email",
service: "Service",
date: "Date",
time: "Time",
selectBarber: "Select barber",
selectProvider: "Select provider",
noBarber: "No barber / Provider",
saveAppointment: "Save Appointment",
appointmentAdded: "Appointment added successfully",
missingAppointmentFields: "Complete the required fields",
appointmentExists: "That time is already booked",
checkingAvailability: "Checking availability...",
   
 },
  
es: {
      dashboard: "Panel del Negocio",
      barbers: "Barberos",
      addBarber: "Agregar Barbero",
      barberName: "Nombre del barbero",
      barberEmail: "Correo del barbero",
      delete: "Eliminar",
      todaysSchedule: "Agenda de Hoy",
      noAppointmentsToday: "No hay citas hoy.",
      calendarView: "Vista de Calendario",
      customerList: "Lista de Clientes",
      allAppointments: "Todas las Citas",
      appointments: "citas",
      last: "Última",
      prev: "Anterior",
      next: "Siguiente",
      businessInfo: "Información del Negocio",
      bookingLink: "Enlace de Reserva",
      copyLink: "Copiar Enlace",
      qrCode: "Código QR",
      copied: "¡Enlace copiado!",

      // CITA MANUAL
addAppointment: "Agregar Cita",
customerName: "Nombre del cliente",
customerPhone: "WhatsApp / Teléfono",
customerEmail: "Correo del cliente",
service: "Servicio",
date: "Fecha",
time: "Hora",
selectBarber: "Seleccionar barbero",
selectProvider: "Seleccionar profesional",
noBarber: "Sin barbero / Profesional",
saveAppointment: "Guardar Cita",
appointmentAdded: "Cita agregada correctamente",
missingAppointmentFields: "Completa los campos requeridos",
appointmentExists: "Ese horario ya está ocupado",
checkingAvailability: "Verificando disponibilidad...",   
 },
  };

// BUSINESS PHOTO UPLOAD
async function uploadBusinessPhoto(file) {
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast(
      lang === "es"
        ? "Selecciona una imagen válida."
        : "Select a valid image."
    );
    return;
  }

  setUploadingBusinessPhoto(true);

  try {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeId = Math.random().toString(36).substring(2);

    const fileName =
      `businesses/${businessId}/${safeId}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("barber-photos")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Business photo upload error:", uploadError);

      showToast(
        lang === "es"
          ? "No se pudo subir la foto."
          : "Could not upload photo."
      );

      return;
    }

    const photoUrl =
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/barber-photos/${fileName}`;

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        photo_url: photoUrl,
      })
      .eq("id", businessId);

    if (updateError) {
      console.error("Business photo database error:", updateError);

      showToast(
        lang === "es"
          ? "La foto subió, pero no se pudo guardar."
          : "Photo uploaded, but could not be saved."
      );

      return;
    }

    setBusinessPhotoPreview(photoUrl);

    await loadDashboard();

    showToast(
      lang === "es"
        ? "Foto actualizada correctamente."
        : "Photo updated successfully."
    );
  } finally {
    setUploadingBusinessPhoto(false);
  }
}

// SAVE BUSINESS GOOGLE MAPS PIN
async function saveBusinessMapUrl() {
  const cleanUrl = businessMapUrl.trim();

  if (cleanUrl) {
    try {
      const parsedUrl = new URL(cleanUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      showToast(
        lang === "es"
          ? "Escribe un enlace válido de Google Maps."
          : "Enter a valid Google Maps link."
      );
      return;
    }
  }

  setSavingBusinessMapUrl(true);

  try {
    const { error } = await supabase
      .from("businesses")
      .update({
        map_url: cleanUrl || null,
      })
      .eq("id", businessId);

    if (error) {
      console.error("Business Google Maps save error:", error);

      showToast(
        lang === "es"
          ? "No se pudo guardar la ubicación."
          : "Could not save the location."
      );
      return;
    }

    await loadDashboard();

    showToast(
      lang === "es"
        ? "Ubicación de Google Maps guardada."
        : "Google Maps location saved."
    );
  } finally {
    setSavingBusinessMapUrl(false);
  }
}

  async function loadDashboard() {
    setLoading(true);

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();
    setBusiness(biz || null);
    setBusinessMapUrl(biz?.map_url || "");

   const { data: bar } = await supabase
  .from("barbers")
  .select("*")
  .eq("business_id", businessId);

setBarbers(bar || []);

const { data: prov, error: providerError } = await supabase
  .from("providers")
  .select("*")
  .eq("business_id", businessId);

if (providerError) {
  console.error("Provider loading error:", providerError);
}

setProviders(prov || []);

const { data: serviceData, error: serviceError } = await supabase
  .from("business_services")
  .select("*")
  .eq("business_id", businessId)
  .order("name", { ascending: true });

if (serviceError) {
  console.error("Service loading error:", serviceError);
}

setServices(serviceData || []);

    const { data: appt } = await supabase
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    setAppointments(appt || []);

    const unique = {};
    (appt || []).forEach((a) => {
      if (!unique[a.customer_email]) {
        unique[a.customer_email] = {
          name: a.customer_name,
          email: a.customer_email,
          phone: a.customer_phone,
          last: a.date,
          count: 1,
        };
      } else {
        unique[a.customer_email].count++;
        unique[a.customer_email].last = a.date;
      }
    });

    setCustomers(Object.values(unique));
    setLoading(false);
  }

// LOAD PROVIDER AVAILABILITY
async function loadProviderAvailability(providerId) {
  if (!providerId) {
    setProviderAvailability([]);
    return;
  }

  const { data, error } = await supabase
    .from("provider_availability")
    .select("*")
    .eq("provider_id", providerId)
    .order("day_of_week", { ascending: true });

  if (error) {
    console.error("Provider availability loading error:", error);

    showToast(
      lang === "es"
        ? "No se pudo cargar el horario."
        : "Could not load provider availability."
    );

    return;
  }

  if (!data || data.length === 0) {
    const defaultSchedule = Array.from({ length: 7 }, (_, dayIndex) => ({
      id: `new-${dayIndex}`,
      provider_id: providerId,
      day_of_week: dayIndex,
      is_available: dayIndex >= 1 && dayIndex <= 5,
      start_time: "09:00",
      end_time: "18:00",
    }));

    setProviderAvailability(defaultSchedule);
    return;
  }

  setProviderAvailability(data);
}

// SAVE PROVIDER AVAILABILITY
async function saveProviderAvailability() {
  if (!selectedAvailabilityProviderId) {
    showToast(
      lang === "es"
        ? "Selecciona un profesional."
        : "Select a provider."
    );
    return;
  }

  setSavingProviderAvailability(true);

  try {
    for (const day of providerAvailability) {
      if (day.is_available && (!day.start_time || !day.end_time)) {
        showToast(
          lang === "es"
            ? "Completa las horas de los días disponibles."
            : "Complete the hours for available days."
        );
        return;
      }

      if (day.is_available && day.end_time <= day.start_time) {
        showToast(
          lang === "es"
            ? "La hora de cierre debe ser después de la hora de inicio."
            : "End time must be after start time."
        );
        return;
      }

      // NEW ROW
      if (String(day.id).startsWith("new-")) {
        const { error } = await supabase
          .from("provider_availability")
          .insert({
            provider_id: selectedAvailabilityProviderId,
            day_of_week: day.day_of_week,
            start_time: day.start_time,
            end_time: day.end_time,
            is_available: day.is_available,
          });

        if (error) {
          console.error("Provider availability insert error:", error);

          showToast(
            lang === "es"
              ? "No se pudo guardar el horario."
              : "Could not save the schedule."
          );
          return;
        }

        continue;
      }

      // EXISTING ROW
      const { error } = await supabase
        .from("provider_availability")
        .update({
          start_time: day.start_time,
          end_time: day.end_time,
          is_available: day.is_available,
        })
        .eq("id", day.id)
        .eq("provider_id", selectedAvailabilityProviderId);

      if (error) {
        console.error("Provider availability save error:", error);

        showToast(
          lang === "es"
            ? "No se pudo guardar el horario."
            : "Could not save the schedule."
        );
        return;
      }
    }

    await loadProviderAvailability(selectedAvailabilityProviderId);

    showToast(
      lang === "es"
        ? "Horario guardado correctamente."
        : "Schedule saved successfully."
    );
  } finally {
    setSavingProviderAvailability(false);
  }
}
async function addBarber() {    
if (!newBarberName || !newBarberEmail || !newBarberPin) {
      showToast("Missing fields");
      return;
    }

    if (newBarberPin.length !== 4) {
      showToast("PIN must be 4 digits");
      return;
    }

    const { error } = await supabase.from("barbers").insert({
      name: newBarberName,
      email: newBarberEmail,
      pin: newBarberPin,
      business_id: businessId,
      services: newBarberServices,
      working_days: newBarberDays,
    });

    if (error) {
      showToast("Error adding barber");
      return;
    }

    setNewBarberName("");
    setNewBarberEmail("");
    setNewBarberPin("");

    loadDashboard();
    showToast("Barber added");
  }

// PROVIDER
async function addProvider() {
  if (!newProviderName) {
    showToast(
      lang === "es"
        ? "El nombre es requerido"
        : "Provider name is required"
    );
    return;
  }

  const { error } = await supabase.from("providers").insert({
    business_id: businessId,
    name: newProviderName,
    email: newProviderEmail || null,
    phone: newProviderPhone || null,
    specialty: newProviderSpecialty || null,
  });

  if (error) {
    console.error("Error adding provider:", error);

    showToast(
      lang === "es"
        ? "Error agregando profesional"
        : "Error adding provider"
    );

    return;
  }

  setNewProviderName("");
  setNewProviderEmail("");
  setNewProviderPhone("");
  setNewProviderSpecialty("");

  await loadDashboard();

    showToast(
    lang === "es"
      ? "Profesional agregado"
      : "Provider added"
  );
}

// PROVIDER PROFILE PHOTO
async function uploadProviderPhoto(provider, file) {
  if (!provider?.id || !file) return;

  if (!file.type.startsWith("image/")) {
    showToast(
      lang === "es"
        ? "Selecciona una imagen válida."
        : "Select a valid image."
    );
    return;
  }

  setUploadingProviderPhotoId(provider.id);

  try {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeId = Math.random().toString(36).substring(2);
    const fileName =
      `providers/${businessId}/${provider.id}/${safeId}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("barber-photos")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Provider photo upload error:", uploadError);

      showToast(
        lang === "es"
          ? "No se pudo subir la foto del profesional."
          : "Could not upload the provider photo."
      );
      return;
    }

    const photoUrl =
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/barber-photos/${fileName}`;

    const { error: updateError } = await supabase
      .from("providers")
      .update({
        photo_url: photoUrl,
      })
      .eq("id", provider.id)
      .eq("business_id", businessId);

    if (updateError) {
      console.error("Provider photo database error:", updateError);

      showToast(
        lang === "es"
          ? "La foto subió, pero no se pudo guardar en el profesional."
          : "The photo uploaded, but could not be saved to the provider."
      );
      return;
    }

    await loadDashboard();

    showToast(
      lang === "es"
        ? "Foto del profesional actualizada."
        : "Provider photo updated."
    );
  } finally {
    setUploadingProviderPhotoId(null);
  }
}

// EDIT PROVIDER
function startEditProvider(provider) {
  setEditingProviderId(provider.id);
  setEditProviderName(provider.name || "");
  setEditProviderEmail(provider.email || "");
  setEditProviderPhone(provider.phone || "");
  setEditProviderSpecialty(provider.specialty || "");
}

function cancelEditProvider() {
  setEditingProviderId(null);
  setEditProviderName("");
  setEditProviderEmail("");
  setEditProviderPhone("");
  setEditProviderSpecialty("");
}

async function updateProvider() {
  if (!editingProviderId) return;

  if (!editProviderName.trim()) {
    showToast(
      lang === "es"
        ? "El nombre es requerido."
        : "Provider name is required."
    );
    return;
  }

  setSavingEditProvider(true);

  try {
    const { error } = await supabase
      .from("providers")
      .update({
        name: editProviderName.trim(),
        email: editProviderEmail.trim() || null,
        phone: editProviderPhone.trim() || null,
        specialty: editProviderSpecialty.trim() || null,
      })
      .eq("id", editingProviderId)
      .eq("business_id", businessId);

    if (error) {
      console.error("Update provider error:", error);

      showToast(
        lang === "es"
          ? "No se pudo actualizar el profesional."
          : "Could not update provider."
      );
      return;
    }

    await loadDashboard();
    cancelEditProvider();

    showToast(
      lang === "es"
        ? "Profesional actualizado correctamente."
        : "Provider updated successfully."
    );
  } finally {
    setSavingEditProvider(false);
  }
}

// DELETE PROVIDER
async function deleteProvider(provider) {
  if (!provider?.id) return;

  const { data: providerAppointments, error: appointmentCheckError } =
    await supabase
      .from("appointments")
      .select("id")
      .eq("business_id", businessId)
      .eq("provider_id", provider.id)
      .limit(1);

  if (appointmentCheckError) {
    console.error(
      "Provider appointment check error:",
      appointmentCheckError
    );

    showToast(
      lang === "es"
        ? "No se pudo verificar el historial del profesional."
        : "Could not check provider history."
    );
    return;
  }

  if (providerAppointments?.length > 0) {
    showToast(
      lang === "es"
        ? "No puedes eliminar este profesional porque tiene historial de citas."
        : "You cannot delete this provider because they have appointment history."
    );
    return;
  }

  const confirmed = window.confirm(
    lang === "es"
      ? `¿Seguro que deseas eliminar a ${provider.name}?`
      : `Are you sure you want to delete ${provider.name}?`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("providers")
    .delete()
    .eq("id", provider.id)
    .eq("business_id", businessId);

  if (error) {
    console.error("Delete provider error:", error);

    showToast(
      lang === "es"
        ? "No se pudo eliminar el profesional."
        : "Could not delete provider."
    );
    return;
  }

  if (selectedAvailabilityProviderId === provider.id) {
    setSelectedAvailabilityProviderId("");
    setProviderAvailability([]);
  }

  await loadDashboard();

  showToast(
    lang === "es"
      ? "Profesional eliminado correctamente."
      : "Provider deleted successfully."
  );
}


// BUSINESS SERVICES
async function addService() {
  if (!newServiceName.trim()) {
    showToast(
      lang === "es"
        ? "Escribe el nombre del servicio."
        : "Enter the service name.",
      "error"
    );
    return;
  }

  if (!newServiceDuration || Number(newServiceDuration) <= 0) {
    showToast(
      lang === "es"
        ? "La duración debe ser mayor de 0."
        : "Duration must be greater than 0.",
      "error"
    );
    return;
  }

  setSavingService(true);

  const { data, error } = await supabase
    .from("business_services")
    .insert([
      {
        business_id: businessId,
        provider_id: newServiceProviderId || null,
        name: newServiceName.trim(),
        description: newServiceDescription.trim() || null,
        price: newServicePrice !== "" ? Number(newServicePrice) : null,
        duration: Number(newServiceDuration),
        is_active: true,
      },
    ])
    .select()
    .single();

  setSavingService(false);

  if (error) {
    console.error("Add service error:", error);

    showToast(
      lang === "es"
        ? "No se pudo agregar el servicio."
        : "Could not add service.",
      "error"
    );
    return;
  }

  setServices((prev) =>
    [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
  );

  setNewServiceName("");
  setNewServiceDescription("");
  setNewServicePrice("");
  setNewServiceDuration("30");
  setNewServiceProviderId("");

  showToast(
  lang === "es"
    ? "Servicio agregado correctamente."
    : "Service added successfully.",
  "success"
);
}

// START EDITING SERVICE
function startEditService(service) {
  setEditingServiceId(service.id);
  setEditServiceName(service.name || "");
  setEditServiceDescription(service.description || "");
  setEditServicePrice(
    service.price !== null && service.price !== undefined
      ? String(service.price)
      : ""
  );
  setEditServiceDuration(String(service.duration || ""));
  setEditServiceProviderId(service.provider_id || "");
}

// CANCEL EDITING SERVICE
function cancelEditService() {
  setEditingServiceId(null);
  setEditServiceName("");
  setEditServiceDescription("");
  setEditServicePrice("");
  setEditServiceDuration("");
  setEditServiceProviderId("");
}

// UPDATE SERVICE
async function updateService() {
  if (!editingServiceId) return;

  if (!editServiceName.trim()) {
    showToast(
      lang === "es"
        ? "Escribe el nombre del servicio."
        : "Enter the service name."
    );
    return;
  }

  if (!editServiceDuration || Number(editServiceDuration) <= 0) {
    showToast(
      lang === "es"
        ? "La duración debe ser mayor de 0."
        : "Duration must be greater than 0."
    );
    return;
  }

  setSavingEditService(true);

  const { error } = await supabase
    .from("business_services")
    .update({
      name: editServiceName.trim(),
      description: editServiceDescription.trim() || null,
      price:
        editServicePrice !== ""
          ? Number(editServicePrice)
          : null,
      duration: Number(editServiceDuration),
      provider_id: editServiceProviderId || null,
    })
    .eq("id", editingServiceId)
    .eq("business_id", businessId);

  setSavingEditService(false);

  if (error) {
    console.error("Update service error:", error);

    showToast(
      lang === "es"
        ? "No se pudo actualizar el servicio."
        : "Could not update service."
    );
    return;
  }

  await loadDashboard();
  cancelEditService();

  showToast(
    lang === "es"
      ? "Servicio actualizado correctamente."
      : "Service updated successfully."
  );
}

// TOUR SERVICE SCHEDULE
function formatTourDepartureTime(timeValue) {
  if (!timeValue) return "";

  const clean = String(timeValue).slice(0, 5);
  const [hourString, minute] = clean.split(":");
  let hour = Number(hourString);
  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;
  return `${hour}:${minute} ${period}`;
}

function startEditTourSettings(service) {
  setEditingTourServiceId(service.id);
  setTourDepartureTimes(
    Array.isArray(service.departure_times)
      ? service.departure_times.map((time) => String(time).slice(0, 5)).sort()
      : []
  );
  setTourMaxGuests(
    service.max_guests_per_departure !== null &&
    service.max_guests_per_departure !== undefined
      ? String(service.max_guests_per_departure)
      : ""
  );
  setNewTourDepartureTime("");
}

function cancelEditTourSettings() {
  setEditingTourServiceId(null);
  setTourDepartureTimes([]);
  setNewTourDepartureTime("");
  setTourMaxGuests("");
}

function addTourDepartureTime() {
  if (!newTourDepartureTime) return;

  setTourDepartureTimes((current) => {
    if (current.includes(newTourDepartureTime)) {
      return current;
    }

    return [...current, newTourDepartureTime].sort();
  });

  setNewTourDepartureTime("");
}

function removeTourDepartureTime(timeToRemove) {
  setTourDepartureTimes((current) =>
    current.filter((time) => time !== timeToRemove)
  );
}

async function saveTourSettings() {
  if (!editingTourServiceId) return;

  if (tourDepartureTimes.length === 0) {
    showToast(
      lang === "es"
        ? "Agrega por lo menos una hora de salida."
        : "Add at least one departure time."
    );
    return;
  }

  const maxGuests = Number(tourMaxGuests);

  if (!Number.isInteger(maxGuests) || maxGuests <= 0) {
    showToast(
      lang === "es"
        ? "La capacidad debe ser mayor de 0."
        : "Capacity must be greater than 0."
    );
    return;
  }

  setSavingTourSettings(true);

  try {
    const departureTimesForDatabase = tourDepartureTimes.map(
      (time) => `${time}:00`
    );

    const { error } = await supabase
      .from("business_services")
      .update({
        departure_times: departureTimesForDatabase,
        max_guests_per_departure: maxGuests,
      })
      .eq("id", editingTourServiceId)
      .eq("business_id", businessId);

    if (error) {
      console.error("Save tour schedule error:", error);
      showToast(
        lang === "es"
          ? "No se pudo guardar el horario del tour."
          : "Could not save the tour schedule."
      );
      return;
    }

    await loadDashboard();
    cancelEditTourSettings();

    showToast(
      lang === "es"
        ? "Horario y capacidad guardados."
        : "Departure times and capacity saved."
    );
  } finally {
    setSavingTourSettings(false);
  }
}

// TOGGLE SERVICE ACTIVE / INACTIVE
async function toggleServiceActive(service) {
  const newStatus = !service.is_active;

  const { error } = await supabase
    .from("business_services")
    .update({
      is_active: newStatus,
    })
    .eq("id", service.id)
    .eq("business_id", businessId);

  if (error) {
    console.error("Toggle service status error:", error);

    showToast(
      lang === "es"
        ? "No se pudo actualizar el estado del servicio."
        : "Could not update service status."
    );
    return;
  }

  await loadDashboard();

  showToast(
    newStatus
      ? lang === "es"
        ? "Servicio activado."
        : "Service activated."
      : lang === "es"
      ? "Servicio desactivado."
      : "Service deactivated."
  );
}


// --------------------------------------------------
// TOUR MANUAL RESERVATION
// --------------------------------------------------
async function addTourReservation() {
  if (
    !newAppointmentName.trim() ||
    !newAppointmentPhone.trim() ||
    !newAppointmentService ||
    !newAppointmentDate ||
    !newAppointmentTime ||
    !newTourGuestCount ||
    Number(newTourGuestCount) < 1 ||
    !newTourPickupLocation.trim()
  ) {
    showToast(
      lang === "es"
        ? "Completa todos los campos de la reserva."
        : "Complete all reservation fields."
    );
    return;
  }

  const selectedService = services.find(
    (service) => service.id === newAppointmentService
  );

  if (!selectedService) {
    showToast(
      lang === "es"
        ? "Selecciona un tour válido."
        : "Select a valid tour."
    );
    return;
  }

  const providerId =
    selectedService.provider_id ||
    newAppointmentProviderId ||
    null;

  if (!providerId) {
    showToast(
      lang === "es"
        ? "Este tour necesita un profesional o guía asignado."
        : "This tour needs an assigned provider or guide."
    );
    return;
  }

  const configuredDepartures = Array.isArray(
    selectedService.departure_times
  )
    ? selectedService.departure_times.map((time) =>
        String(time).slice(0, 5)
      )
    : [];

  const selectedDeparture =
    String(newAppointmentTime).slice(0, 5);

  if (!configuredDepartures.includes(selectedDeparture)) {
    showToast(
      lang === "es"
        ? "Selecciona una hora de salida configurada para este tour."
        : "Select a configured departure time for this tour."
    );
    return;
  }

  const maxGuests =
    Number(selectedService.max_guests_per_departure) || 0;

  if (maxGuests < 1) {
    showToast(
      lang === "es"
        ? "Este tour no tiene capacidad configurada."
        : "This tour does not have a configured capacity."
    );
    return;
  }

  setSavingAppointment(true);

  try {
    const {
      data: existingReservations,
      error: capacityError,
    } = await supabase
      .from("appointments")
      .select("service_id, service, time, guest_count, status")
      .eq("business_id", businessId)
      .eq("provider_id", providerId)
      .eq("date", newAppointmentDate)
      .eq("status", "confirmed");

    if (capacityError) {
      console.error(
        "Tour capacity check error:",
        capacityError
      );

      showToast(
        lang === "es"
          ? "No se pudo verificar la capacidad."
          : "Could not verify capacity."
      );
      return;
    }

    const bookedGuests = (existingReservations || [])
      .filter((reservation) => {
        const sameTime =
          String(reservation.time || "").slice(0, 5) ===
          selectedDeparture;

        const sameService =
          reservation.service_id === selectedService.id ||
          (!reservation.service_id &&
            reservation.service === selectedService.name);

        return sameTime && sameService;
      })
      .reduce(
        (total, reservation) =>
          total +
          Math.max(
            1,
            Number(reservation.guest_count) || 1
          ),
        0
      );

    const requestedGuests = Number(newTourGuestCount);
    const remainingGuests = maxGuests - bookedGuests;

    if (requestedGuests > remainingGuests) {
      showToast(
        lang === "es"
          ? remainingGuests > 0
            ? `Solo quedan ${remainingGuests} espacios para esta salida.`
            : "Esta salida está llena."
          : remainingGuests > 0
          ? `Only ${remainingGuests} spots remain for this departure.`
          : "This departure is full."
      );
      return;
    }

    const {
      data: createdReservation,
      error: insertError,
    } = await supabase
      .from("appointments")
      .insert({
        business_id: businessId,
        barber_id: null,
        provider_id: providerId,
        service_id: selectedService.id,
        service: selectedService.name,
        date: newAppointmentDate,
        time: newAppointmentTime,
        duration: Number(selectedService.duration) || 60,
        price:
          selectedService.price !== null &&
          selectedService.price !== undefined
            ? Number(selectedService.price)
            : null,
        customer_name: newAppointmentName.trim(),
        customer_phone: newAppointmentPhone.trim(),
        customer_email: newAppointmentEmail.trim() || null,
        guest_count: requestedGuests,
        pickup_location: newTourPickupLocation.trim(),
        is_group_booking: true,
        status: "confirmed",
        lang: lang,
        whatsapp_reminder_sent: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error(
        "Tour reservation insert error:",
        insertError
      );

      showToast(
        lang === "es"
          ? "No se pudo guardar la reserva."
          : "Could not save the reservation."
      );
      return;
    }

    console.log(
      "Tour reservation created:",
      createdReservation?.id
    );

    // --------------------------------------------------
    // SEND CUSTOMER CONFIRMATION EMAIL
    // --------------------------------------------------
    if (newAppointmentEmail.trim()) {
      try {
        const baseUrl = window.location.origin;

        const confirmationResponse = await fetch(
          "/api/send-confirmation",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customer_email: newAppointmentEmail.trim(),
              customer_name: newAppointmentName.trim(),
              service: selectedService.name,
              barber_id: null,
              provider_id: providerId,
              business_id: businessId,
              date: newAppointmentDate,
              time: newAppointmentTime,
              secret_link: `${baseUrl}/customer/${createdReservation.id}`,
              lang: lang,
              guest_count: requestedGuests,
              pickup_location: newTourPickupLocation.trim(),
              is_group_booking: true,
            }),
          }
        );

        const confirmationData =
          await confirmationResponse.json();

        if (
          !confirmationResponse.ok ||
          !confirmationData?.success
        ) {
          console.error(
            "Tour confirmation email error:",
            confirmationData
          );
        } else {
          console.log(
            "Tour confirmation email sent successfully."
          );
        }
      } catch (emailError) {
        console.error(
          "Tour confirmation email request failed:",
          emailError
        );
      }
    }

    setNewAppointmentName("");
    setNewAppointmentPhone("");
    setNewAppointmentEmail("");
    setNewAppointmentService("");
    setNewAppointmentDate("");
    setNewAppointmentTime("");
    setNewAppointmentProviderId("");
    setNewTourGuestCount("");
    setNewTourPickupLocation("");

    await loadDashboard();

    showToast(
      lang === "es"
        ? "Reserva agregada correctamente."
        : "Reservation added successfully."
    );
  } finally {
    setSavingAppointment(false);
  }
}


// MANUAL APPOINTMENT
async function addAppointment() {
  if (
    !newAppointmentName ||
    !newAppointmentPhone ||
    !newAppointmentService ||
    !newAppointmentDate ||
    !newAppointmentTime
  ) {
    showToast(t[lang].missingAppointmentFields);
    return;
  }

  setSavingAppointment(true);

  try {
    // --------------------------------------------------
    // GENERIC BUSINESS SERVICE
    // Barber businesses continue using free-text service
    // --------------------------------------------------
    let selectedService = null;
    let serviceName = newAppointmentService;
    let serviceDuration = null;
    let servicePrice = null;
    let effectiveProviderId = newAppointmentProviderId || null;

    if (!isBarberBusiness) {
      selectedService = services.find(
        (service) => service.id === newAppointmentService
      );

      if (!selectedService) {
        showToast(
          lang === "es"
            ? "Selecciona un servicio válido."
            : "Select a valid service."
        );
        return;
      }

      serviceName = selectedService.name;
      serviceDuration = selectedService.duration;
      servicePrice = selectedService.price;

      // If the service belongs to a specific provider,
      // use that provider automatically.
      if (selectedService.provider_id) {
        effectiveProviderId = selectedService.provider_id;
      }

      if (!effectiveProviderId) {
        showToast(
          lang === "es"
            ? "Selecciona un profesional."
            : "Select a provider."
        );
        return;
      }
    }

 // --------------------------------------------------
// CHECK APPOINTMENT OVERLAP
// --------------------------------------------------
let query = supabase
  .from("appointments")
  .select("id, barber_id, provider_id, customer_name, time, duration")
  .eq("business_id", businessId)
  .eq("date", newAppointmentDate)
  .eq("status", "confirmed");

if (isBarberBusiness && newAppointmentBarberId) {
  query = query.eq("barber_id", newAppointmentBarberId);
}

if (!isBarberBusiness && effectiveProviderId) {
  query = query.eq("provider_id", effectiveProviderId);
}

const { data: existingAppointments, error: checkError } =
  await query;

if (checkError) {
  console.error("Availability check error:", checkError);

  showToast(
    lang === "es"
      ? "Error verificando disponibilidad"
      : "Error checking availability"
  );

  return;
}

// Barber side keeps the old exact-start behavior.
// Generic businesses use duration-based overlap checking.
if (isBarberBusiness) {
  const exactMatch = existingAppointments?.some(
    (appointment) =>
      appointment.time?.slice(0, 5) === newAppointmentTime
  );

  if (exactMatch) {
    showToast(t[lang].appointmentExists);
    return;
  }
} else {
  const timeToMinutes = (timeValue) => {
    const [hours, minutes] = timeValue.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
  };

  const newStart = timeToMinutes(newAppointmentTime);
  const newEnd = newStart + Number(serviceDuration);

  const hasOverlap = existingAppointments?.some((appointment) => {
    const existingStart = timeToMinutes(appointment.time);

    const existingDuration =
      Number(appointment.duration) > 0
        ? Number(appointment.duration)
        : 30;

    const existingEnd = existingStart + existingDuration;

    return newStart < existingEnd && newEnd > existingStart;
  });

  if (hasOverlap) {
    showToast(
      lang === "es"
        ? "Ese horario se cruza con otra cita."
        : "That time overlaps with another appointment."
    );
    return;
  }
}
    // --------------------------------------------------
    // APPOINTMENT DATA
    // --------------------------------------------------
    const appointmentData = {
      business_id: businessId,

      barber_id: isBarberBusiness
        ? newAppointmentBarberId || null
        : null,

      provider_id: !isBarberBusiness
        ? effectiveProviderId
        : null,

      service: serviceName,
      date: newAppointmentDate,
      time: newAppointmentTime,
      customer_name: newAppointmentName,
      customer_phone: newAppointmentPhone,
      customer_email: newAppointmentEmail || null,
      status: "confirmed",
      lang: lang,
      whatsapp_reminder_sent: false,
    };

    // Only generic businesses use business_services here.
    // This leaves the barber appointment behavior unchanged.
    if (!isBarberBusiness) {
      appointmentData.duration = serviceDuration;
      appointmentData.price = servicePrice;
    }

    const { error } = await supabase
      .from("appointments")
      .insert(appointmentData);

    if (error) {
      console.error("Add appointment error:", error);

      showToast(
        lang === "es"
          ? "Error creando la cita"
          : "Error creating appointment"
      );

      return;
    }

    // Clear form
    setNewAppointmentName("");
    setNewAppointmentPhone("");
    setNewAppointmentEmail("");
    setNewAppointmentService("");
    setNewAppointmentDate("");
    setNewAppointmentTime("");
    setNewAppointmentBarberId("");
    setNewAppointmentProviderId("");

    await loadDashboard();

    showToast(t[lang].appointmentAdded);
  } finally {
    setSavingAppointment(false);
  }
}

async function deleteBarber(id) {    
if (!confirm("Delete this barber?")) return;

    await supabase.from("barbers").delete().eq("id", id);
    loadDashboard();
    showToast("Barber deleted");
  }

  const barberMap = Object.fromEntries(
  barbers.map((b) => [b.id, b.name])
);

const providerMap = Object.fromEntries(
  providers.map((p) => [p.id, p.name])
);

  const today = new Date().toISOString().split("T")[0];
  const todaysAppointments = appointments.filter((a) => a.date === today);

  function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }
  async function loadAppointmentsForDate(dateStr) {
    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .eq("date", dateStr)
      .order("time", { ascending: true });

    setSelectedAppointments(data || []);
  }

  function changeMonth(offset) {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setSelectedMonth(newMonth);
    setSelectedDate(null);
    setSelectedAppointments([]);
  }

  /* ⭐ FILTER + GROUP + PAGINATION LOGIC ⭐ */

  const APPOINTMENTS_PER_PAGE = 20;

// FILTER APPOINTMENTS
const filteredAppointments = appointments.filter((a) => {
  
// filter by barber / provider
if (filterBarberId !== "all") {
  if (isBarberBusiness && a.barber_id !== filterBarberId) return false;
  if (!isBarberBusiness && a.provider_id !== filterBarberId) return false;
}
  // filter by exact date
  if (filterDate && a.date !== filterDate) return false;

  // filter by month (YYYY-MM)
  if (filterMonth !== "all") {
    const monthStr = a.date.slice(0, 7); // "YYYY-MM"
    if (monthStr !== filterMonth) return false;
  }

  return true;
});

// GROUP BY BARBER / PROVIDER
const groupedByBarber = {};

filteredAppointments.forEach((a) => {
  const personId = isBarberBusiness
    ? a.barber_id
    : a.provider_id;

  if (!groupedByBarber[personId]) {
    groupedByBarber[personId] = [];
  }

  groupedByBarber[personId].push(a);
});

// COLLAPSE TOGGLE
const toggleBarberOpen = (barberId) => {
  setOpenBarbers((prev) => ({
    ...prev,
    [barberId]: !(prev[barberId] ?? true),
  }));
};

// PAGINATION PER BARBER
const changeBarberPage = (barberId, newPage) => {
  setPageByBarber((prev) => ({
    ...prev,
    [barberId]: newPage,
  }));
};


async function handleDeleteBusiness() {
  if (!businessId || deletingBusiness) return;

  const firstConfirm = window.confirm(
    lang === "es"
      ? "¿Seguro que deseas eliminar este negocio? Se eliminarán sus citas, profesionales, servicios y horarios. Esta acción no se puede deshacer."
      : "Are you sure you want to delete this business? Its appointments, providers, services, and schedules will be deleted. This cannot be undone."
  );

  if (!firstConfirm) return;

  const secondConfirm = window.confirm(
    lang === "es"
      ? "Confirmación final: ¿Eliminar permanentemente tu cuenta de negocio?"
      : "Final confirmation: permanently delete your business account?"
  );

  if (!secondConfirm) return;

  setDeletingBusiness(true);

  try {
const {
  data: { session },
  error: sessionError,
} = await supabase.auth.getSession();

if (sessionError || !session?.access_token) {
  showToast(
    lang === "es"
      ? "Tu sesión expiró. Inicia sesión nuevamente."
      : "Your session expired. Please sign in again."
  );

  return;
}

const response = await fetch("/api/business/delete", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ businessId }),
});    

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Delete business error:", result);

      showToast(
        lang === "es"
          ? result?.error || "No se pudo eliminar el negocio."
          : result?.error || "Could not delete the business."
      );

      return;
    }

    await supabase.auth.signOut();
    window.location.href = "/login";
  } catch (error) {
    console.error("Delete business request error:", error);

    showToast(
      lang === "es"
        ? "Ocurrió un error al eliminar el negocio."
        : "An error occurred while deleting the business."
    );
  } finally {
    setDeletingBusiness(false);
  }
}


 if (checkingAuth) {
  return <p className="p-6 text-center">Checking access…</p>;
}

if (!accessGranted) {
  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-4 text-red-600">
        Access Denied
      </h1>

      <p className="text-gray-600">
        You do not have permission to access this business.
      </p>
    </div>
  );
}

  if (loading) return <p className="p-6">Loading...</p>;
  return (
    <div className="max-w-5xl mx-auto p-6">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-4 right-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* LANGUAGE TOGGLE */}
      <div className="flex justify-end mb-4 text-sm font-semibold cursor-pointer">
        <span
          className={lang === "es" ? "text-blue-600" : "text-gray-500"}
          onClick={() => setLang("es")}
        >
          ES
        </span>
        <span className="mx-2">|</span>
        <span
          className={lang === "en" ? "text-blue-600" : "text-gray-500"}
          onClick={() => setLang("en")}
        >
          EN
        </span>
      </div>

      <h1 className="text-3xl font-bold mb-6">
        {business?.name} — {t[lang].dashboard}
      </h1>

     {/* BUSINESS INFO */}
<section className="mb-12">
  <h2 className="text-2xl font-semibold mb-3">{t[lang].businessInfo}</h2>

<div className="bg-white p-4 rounded-xl shadow space-y-4 border">
  <p><strong>Name:</strong> {business?.name}</p>
  <p><strong>Phone:</strong> {business?.phone}</p>
  <p><strong>Address:</strong> {business?.address}</p>

  {!isBarberBusiness && (
    <div className="pt-3 border-t space-y-5">
      {/* GOOGLE MAPS PIN */}
      <div>
        <p className="font-semibold mb-2">
          {lang === "es"
            ? "Ubicación exacta en Google Maps"
            : "Exact Google Maps Location"}
        </p>

        <p className="text-sm text-gray-500 mb-2">
          {lang === "es"
            ? "Pega aquí el enlace del pin de tu negocio en Google Maps."
            : "Paste your business Google Maps pin link here."}
        </p>

        <input
          type="url"
          value={businessMapUrl}
          onChange={(e) => setBusinessMapUrl(e.target.value)}
          placeholder="https://maps.app.goo.gl/..."
          className="border p-2 rounded w-full"
        />

        <div className="flex flex-wrap items-center gap-3 mt-3">
          <button
            type="button"
            onClick={saveBusinessMapUrl}
            disabled={savingBusinessMapUrl}
            className={`px-4 py-2 rounded font-medium ${
              savingBusinessMapUrl
                ? "bg-gray-300 text-gray-600"
                : "bg-blue-600 text-white"
            }`}
          >
            {savingBusinessMapUrl
              ? lang === "es"
                ? "Guardando..."
                : "Saving..."
              : lang === "es"
              ? "Guardar ubicación"
              : "Save Location"}
          </button>

          {business?.map_url && (
            <a
              href={business.map_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm"
            >
              {lang === "es"
                ? "Ver pin guardado"
                : "View saved pin"}
            </a>
          )}
        </div>
      </div>

      {/* BUSINESS PHOTO */}
      <div className="pt-4 border-t">
      <p className="font-semibold mb-3">
        {lang === "es" ? "Foto del negocio" : "Business Photo"}
      </p>

      {(businessPhotoPreview || business?.photo_url) && (
        <img
          src={businessPhotoPreview || business.photo_url}
          alt={business?.name || "Business"}
          className="w-40 h-40 object-cover rounded-lg border mb-3"
        />
      )}

      <label
        className={`inline-flex items-center gap-2 px-4 py-2 rounded cursor-pointer ${
          uploadingBusinessPhoto
            ? "bg-gray-300 text-gray-600"
            : "bg-blue-600 text-white"
        }`}
      >
        📸{" "}
        {uploadingBusinessPhoto
          ? lang === "es"
            ? "Subiendo..."
            : "Uploading..."
          : business?.photo_url
          ? lang === "es"
            ? "Cambiar Foto"
            : "Change Photo"
          : lang === "es"
          ? "Subir Foto"
          : "Upload Photo"}

        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploadingBusinessPhoto}
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              uploadBusinessPhoto(file);
            }

            e.target.value = "";
          }}
        />
      </label>
      </div>
    </div>
  )}
</div>  
</section>

{/* TOUR RESERVATION OR NORMAL APPOINTMENT */}
{isTourBusiness ? (
  <section className="mb-12">
    <h2 className="text-2xl font-semibold mb-3">
      {lang === "es" ? "Agregar Reserva" : "Add Reservation"}
    </h2>

    <div className="bg-white border rounded-xl shadow p-4 space-y-4">
      <input
        type="text"
        value={newAppointmentName}
        onChange={(e) => setNewAppointmentName(e.target.value)}
        placeholder={
          lang === "es"
            ? "Nombre del cliente"
            : "Customer name"
        }
        className="border p-2 rounded w-full"
      />

      <input
        type="tel"
        value={newAppointmentPhone}
        onChange={(e) => setNewAppointmentPhone(e.target.value)}
        placeholder={
          lang === "es"
            ? "WhatsApp / Teléfono"
            : "WhatsApp / Phone"
        }
        className="border p-2 rounded w-full"
      />

      <input
        type="email"
        value={newAppointmentEmail}
        onChange={(e) => setNewAppointmentEmail(e.target.value)}
        placeholder={
          lang === "es"
            ? "Correo del cliente"
            : "Customer email"
        }
        className="border p-2 rounded w-full"
      />

      <div>
        <label className="block font-semibold mb-1">
          Tour
        </label>

        <select
          value={newAppointmentService}
          onChange={(e) => {
            const serviceId = e.target.value;

            setNewAppointmentService(serviceId);
            setNewAppointmentTime("");

            const service = services.find(
              (item) => item.id === serviceId
            );

            setNewAppointmentProviderId(
              service?.provider_id || ""
            );
          }}
          className="border p-2 rounded w-full"
        >
          <option value="">
            {lang === "es"
              ? "Selecciona un tour"
              : "Select a tour"}
          </option>

          {services
            .filter((service) => service.is_active !== false)
            .map((service) => (
              <option
                key={service.id}
                value={service.id}
              >
                {service.name}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block font-semibold mb-1">
          {lang === "es" ? "Fecha" : "Date"}
        </label>

        <input
          type="date"
          value={newAppointmentDate}
          onChange={(e) =>
            setNewAppointmentDate(e.target.value)
          }
          className="border p-2 rounded w-full"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">
          {lang === "es"
            ? "Hora de salida"
            : "Departure Time"}
        </label>

        <select
          value={newAppointmentTime}
          onChange={(e) =>
            setNewAppointmentTime(e.target.value)
          }
          className="border p-2 rounded w-full"
          disabled={!newAppointmentService}
        >
          <option value="">
            {lang === "es"
              ? "Selecciona una salida"
              : "Select a departure"}
          </option>

          {(
            services.find(
              (service) =>
                service.id === newAppointmentService
            )?.departure_times || []
          ).map((time) => {
            const cleanTime = String(time).slice(0, 5);

            return (
              <option
                key={cleanTime}
                value={cleanTime}
              >
                {formatTourDepartureTime(cleanTime)}
              </option>
            );
          })}
        </select>
      </div>

      <div>
        <label className="block font-semibold mb-1">
          {lang === "es"
            ? "Cantidad de personas"
            : "Number of Guests"}
        </label>

        <input
          type="number"
          min="1"
          step="1"
          value={newTourGuestCount}
          onChange={(e) =>
            setNewTourGuestCount(e.target.value)
          }
          placeholder="3"
          className="border p-2 rounded w-full"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">
          {lang === "es"
            ? "Punto de encuentro o recogida"
            : "Meeting / Pickup Location"}
        </label>

        <input
          type="text"
          value={newTourPickupLocation}
          onChange={(e) =>
            setNewTourPickupLocation(e.target.value)
          }
          placeholder={
            lang === "es"
              ? "Ej. Barceló Resort"
              : "Example: Barceló Resort"
          }
          className="border p-2 rounded w-full"
        />
      </div>

      <button
        type="button"
        onClick={addTourReservation}
        disabled={savingAppointment}
        className="bg-green-600 text-white px-5 py-3 rounded-lg w-full disabled:opacity-50"
      >
        {savingAppointment
          ? lang === "es"
            ? "Guardando..."
            : "Saving..."
          : lang === "es"
          ? "Guardar Reserva"
          : "Save Reservation"}
      </button>
    </div>
  </section>
) : (
  <>
    <ManualAppointment
      t={t}
      lang={lang}
      isBarberBusiness={isBarberBusiness}

      newAppointmentName={newAppointmentName}
      setNewAppointmentName={setNewAppointmentName}
      newAppointmentPhone={newAppointmentPhone}
      setNewAppointmentPhone={setNewAppointmentPhone}
      newAppointmentEmail={newAppointmentEmail}
      setNewAppointmentEmail={setNewAppointmentEmail}
      newAppointmentService={newAppointmentService}
      setNewAppointmentService={setNewAppointmentService}
      newAppointmentDate={newAppointmentDate}
      setNewAppointmentDate={setNewAppointmentDate}
      newAppointmentTime={newAppointmentTime}
      setNewAppointmentTime={setNewAppointmentTime}

      newAppointmentBarberId={newAppointmentBarberId}
      setNewAppointmentBarberId={setNewAppointmentBarberId}
      newAppointmentProviderId={newAppointmentProviderId}
      setNewAppointmentProviderId={setNewAppointmentProviderId}

      barbers={barbers}
      providers={providers}
      services={services}

      addAppointment={addAppointment}
      savingAppointment={savingAppointment}
    />

    <BusinessQRCode
      t={t}
      lang={lang}
      businessId={businessId}
    />
  </>
)}

{/* BARBERS */}
{isBarberBusiness && (
  <BarberManagement
    t={t}
    lang={lang}
    newBarberName={newBarberName}
    setNewBarberName={setNewBarberName}
    newBarberEmail={newBarberEmail}
    setNewBarberEmail={setNewBarberEmail}
    newBarberPin={newBarberPin}
    setNewBarberPin={setNewBarberPin}
    newBarberServices={newBarberServices}
    setNewBarberServices={setNewBarberServices}
    newBarberDays={newBarberDays}
    setNewBarberDays={setNewBarberDays}
    serviceLabels={serviceLabels}
    dayLabels={dayLabels}
    addBarber={addBarber}
    barbers={barbers}
    deleteBarber={deleteBarber}
    showToast={showToast}
  />
)}
{/* PROVIDERS */}
{!isBarberBusiness && (
  <section className="mb-12">
    <h2 className="text-2xl font-semibold mb-3">
      {lang === "es" ? "Profesionales" : "Providers"}
    </h2>

    {/* ADD PROVIDER */}
    <div className="space-y-4 bg-white p-4 rounded-xl shadow">

      <div className="grid grid-cols-2 gap-2">
        <input
          className="border p-2 rounded"
          placeholder={lang === "es" ? "Nombre del profesional" : "Provider name"}
          value={newProviderName}
          onChange={(e) => setNewProviderName(e.target.value)}
        />

        <input
          className="border p-2 rounded"
          placeholder={lang === "es" ? "Especialidad" : "Specialty"}
          value={newProviderSpecialty}
          onChange={(e) => setNewProviderSpecialty(e.target.value)}
        />

        <input
          className="border p-2 rounded"
          placeholder={lang === "es" ? "Correo electrónico" : "Email"}
          value={newProviderEmail}
          onChange={(e) => setNewProviderEmail(e.target.value)}
        />

        <input
          className="border p-2 rounded"
          placeholder={lang === "es" ? "Teléfono" : "Phone"}
          value={newProviderPhone}
          onChange={(e) => setNewProviderPhone(e.target.value)}
        />
      </div>

      <button
        className="bg-green-600 text-white px-4 py-2 rounded mb-2"
        onClick={addProvider}
      >
        {lang === "es" ? "Agregar Profesional" : "Add Provider"}
      </button>
    </div>

    {/* PROVIDER PROFILE PHOTOS */}
    {providers.length > 0 && (
      <div className="bg-white border rounded-xl shadow p-4 mb-5">
        <h3 className="text-lg font-semibold mb-1">
          {lang === "es" ? "Fotos de los profesionales" : "Provider Photos"}
        </h3>

        <p className="text-sm text-gray-500 mb-4">
          {lang === "es"
            ? "Cada profesional puede tener su propia foto para mostrarla en la página de reservas."
            : "Each provider can have their own photo shown on the booking page."}
        </p>

        <div className="space-y-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border rounded-lg p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-16 h-16 rounded-full bg-gray-100 border overflow-hidden flex items-center justify-center shrink-0">
                  {provider.photo_url ? (
                    <img
                      src={provider.photo_url}
                      alt={provider.name || "Provider"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-semibold truncate">{provider.name}</p>
                  {provider.specialty && (
                    <p className="text-sm text-gray-500 truncate">
                      {provider.specialty}
                    </p>
                  )}
                </div>
              </div>

              <label
                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded cursor-pointer whitespace-nowrap ${
                  uploadingProviderPhotoId === provider.id
                    ? "bg-gray-300 text-gray-600"
                    : "bg-blue-600 text-white"
                }`}
              >
                📸{" "}
                {uploadingProviderPhotoId === provider.id
                  ? lang === "es"
                    ? "Subiendo..."
                    : "Uploading..."
                  : provider.photo_url
                  ? lang === "es"
                    ? "Cambiar Foto"
                    : "Change Photo"
                  : lang === "es"
                  ? "Subir Foto"
                  : "Upload Photo"}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingProviderPhotoId === provider.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (file) {
                      uploadProviderPhoto(provider, file);
                    }

                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    )}

    <ProviderList
  providers={providers}
  lang={lang}

  editingProviderId={editingProviderId}
  editProviderName={editProviderName}
  setEditProviderName={setEditProviderName}
  editProviderEmail={editProviderEmail}
  setEditProviderEmail={setEditProviderEmail}
  editProviderPhone={editProviderPhone}
  setEditProviderPhone={setEditProviderPhone}
  editProviderSpecialty={editProviderSpecialty}
  setEditProviderSpecialty={setEditProviderSpecialty}

  savingEditProvider={savingEditProvider}

  startEditProvider={startEditProvider}
  cancelEditProvider={cancelEditProvider}
  updateProvider={updateProvider}
  deleteProvider={deleteProvider}
/>
   {/* PROVIDER AVAILABILITY — NOT USED FOR TOURS */}
{!isTourBusiness && (
  <ProviderAvailability
    lang={lang}
    providers={providers}
    selectedAvailabilityProviderId={selectedAvailabilityProviderId}
    setSelectedAvailabilityProviderId={setSelectedAvailabilityProviderId}
    providerAvailability={providerAvailability}
    setProviderAvailability={setProviderAvailability}
    loadProviderAvailability={loadProviderAvailability}
    saveProviderAvailability={saveProviderAvailability}
    savingProviderAvailability={savingProviderAvailability}
  />
)}
  </section>
)}

{/* BUSINESS SERVICES */}
{!isBarberBusiness && (
  <BusinessServices
    lang={lang}
    services={services}
    providers={providers}

    newServiceName={newServiceName}
    setNewServiceName={setNewServiceName}
    newServiceDescription={newServiceDescription}
    setNewServiceDescription={setNewServiceDescription}
    newServicePrice={newServicePrice}
    setNewServicePrice={setNewServicePrice}
    newServiceDuration={newServiceDuration}
    setNewServiceDuration={setNewServiceDuration}
    newServiceProviderId={newServiceProviderId}
    setNewServiceProviderId={setNewServiceProviderId}
    savingService={savingService}
    addService={addService}

    editingServiceId={editingServiceId}
    editServiceName={editServiceName}
    setEditServiceName={setEditServiceName}
    editServiceDescription={editServiceDescription}
    setEditServiceDescription={setEditServiceDescription}
    editServicePrice={editServicePrice}
    setEditServicePrice={setEditServicePrice}
    editServiceDuration={editServiceDuration}
    setEditServiceDuration={setEditServiceDuration}
    editServiceProviderId={editServiceProviderId}
    setEditServiceProviderId={setEditServiceProviderId}
    savingEditService={savingEditService}

    startEditService={startEditService}
    cancelEditService={cancelEditService}
    updateService={updateService}
    toggleServiceActive={toggleServiceActive}
  />
)}

{/* TOUR DEPARTURE TIMES + CAPACITY */}
{isTourBusiness && (
  <section className="mb-12">
    <h2 className="text-2xl font-semibold mb-3">
      {lang === "es" ? "Horarios de Tours" : "Tour Departure Times"}
    </h2>

    <div className="bg-white p-4 rounded-xl shadow border space-y-4">
      <p className="text-sm text-gray-600">
        {lang === "es"
          ? "Configura las horas reales de salida y la cantidad máxima de personas para cada tour. Varias reservas pueden usar la misma hora hasta completar la capacidad."
          : "Set the real departure times and maximum number of guests for each tour. Multiple reservations can use the same departure until capacity is reached."}
      </p>

      {services.length === 0 ? (
        <p className="text-sm text-gray-500">
          {lang === "es"
            ? "Primero agrega un servicio de tour."
            : "Add a tour service first."}
        </p>
      ) : (
        <div className="space-y-4">
          {services.map((service) => {
            const departureTimes = Array.isArray(service.departure_times)
              ? service.departure_times
              : [];

            const isEditing = editingTourServiceId === service.id;

            return (
              <div
                key={service.id}
                className="border rounded-xl p-4 bg-gray-50"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-lg">{service.name}</p>

                    <p className="text-sm text-gray-600 mt-1">
                      {lang === "es" ? "Salidas:" : "Departures:"}{" "}
                      {departureTimes.length > 0
                        ? departureTimes
                            .map((time) => formatTourDepartureTime(time))
                            .join(", ")
                        : lang === "es"
                        ? "Sin configurar"
                        : "Not configured"}
                    </p>

                    <p className="text-sm text-gray-600">
                      {lang === "es" ? "Capacidad por salida:" : "Capacity per departure:"}{" "}
                      {service.max_guests_per_departure ||
                        (lang === "es" ? "Sin configurar" : "Not configured")}
                    </p>
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEditTourSettings(service)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                      {lang === "es" ? "Configurar" : "Configure"}
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div>
                      <label className="block font-semibold mb-1">
                        {lang === "es"
                          ? "Máximo de personas por salida"
                          : "Maximum guests per departure"}
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={tourMaxGuests}
                        onChange={(e) => setTourMaxGuests(e.target.value)}
                        className="border p-2 rounded w-full sm:w-64"
                        placeholder="40"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        {lang === "es" ? "Agregar hora de salida" : "Add departure time"}
                      </label>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="time"
                          value={newTourDepartureTime}
                          onChange={(e) => setNewTourDepartureTime(e.target.value)}
                          className="border p-2 rounded sm:w-64"
                        />

                        <button
                          type="button"
                          onClick={addTourDepartureTime}
                          disabled={!newTourDepartureTime}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                        >
                          {lang === "es" ? "+ Agregar Hora" : "+ Add Time"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold mb-2">
                        {lang === "es" ? "Horas configuradas" : "Configured departures"}
                      </p>

                      {tourDepartureTimes.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          {lang === "es"
                            ? "Todavía no hay horas de salida."
                            : "No departure times yet."}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {tourDepartureTimes.map((time) => (
                            <div
                              key={time}
                              className="flex items-center gap-2 border bg-white rounded-lg px-3 py-2"
                            >
                              <span className="font-semibold">
                                {formatTourDepartureTime(time)}
                              </span>

                              <button
                                type="button"
                                onClick={() => removeTourDepartureTime(time)}
                                className="text-red-600 font-bold"
                                title={lang === "es" ? "Eliminar" : "Remove"}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveTourSettings}
                        disabled={savingTourSettings}
                        className="bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50"
                      >
                        {savingTourSettings
                          ? lang === "es"
                            ? "Guardando..."
                            : "Saving..."
                          : lang === "es"
                          ? "Guardar Horario"
                          : "Save Schedule"}
                      </button>

                      <button
                        type="button"
                        onClick={cancelEditTourSettings}
                        disabled={savingTourSettings}
                        className="border px-4 py-2 rounded-lg"
                      >
                        {lang === "es" ? "Cancelar" : "Cancel"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </section>
)}

{/* TODAY'S SCHEDULE */}
<TodaysSchedule
  t={t}
  lang={lang}
  todaysAppointments={todaysAppointments}
  isBarberBusiness={isBarberBusiness}
  barberMap={barberMap}
  providerMap={providerMap}
/>
      {/* CALENDAR */}
<CalendarView
  t={t}
  lang={lang}
  selectedMonth={selectedMonth}
  selectedDate={selectedDate}
  selectedAppointments={selectedAppointments}
  appointments={appointments}
  isBarberBusiness={isBarberBusiness}
  barberMap={barberMap}
  providerMap={providerMap}
  getDaysInMonth={getDaysInMonth}
  changeMonth={changeMonth}
  setSelectedDate={setSelectedDate}
  loadAppointmentsForDate={loadAppointmentsForDate}
/>
      {/* CUSTOMERS */}
<CustomerList
  t={t}
  lang={lang}
  customers={customers}
/>
     {/* ALL APPOINTMENTS */}
<AllAppointments
  t={t}
  lang={lang}
  isBarberBusiness={isBarberBusiness}
  filterBarberId={filterBarberId}
  setFilterBarberId={setFilterBarberId}
  filterDate={filterDate}
  setFilterDate={setFilterDate}
  filterMonth={filterMonth}
  setFilterMonth={setFilterMonth}
  appointments={appointments}
  barberMap={barberMap}
  providerMap={providerMap}
  groupedByBarber={groupedByBarber}
  pageByBarber={pageByBarber}
  openBarbers={openBarbers}
  APPOINTMENTS_PER_PAGE={APPOINTMENTS_PER_PAGE}
  toggleBarberOpen={toggleBarberOpen}
  changeBarberPage={changeBarberPage}
/>
      {/* CLOSE / DELETE BUSINESS ACCOUNT — GENERIC BUSINESSES ONLY */}
      {!isBarberBusiness && (
        <section className="mt-8 border border-red-200 bg-red-50 rounded-xl p-5">
          <h2 className="text-xl font-bold text-red-700 mb-2">
            {lang === "es" ? "Eliminar cuenta" : "Delete Account"}
          </h2>

          <p className="text-sm text-red-700 mb-4">
            {lang === "es"
              ? "Esto eliminará permanentemente este negocio, sus citas, profesionales, servicios y horarios. Esta acción no se puede deshacer."
              : "This permanently deletes this business, its appointments, providers, services, and schedules. This action cannot be undone."}
          </p>

          <button
            type="button"
            onClick={handleDeleteBusiness}
            disabled={deletingBusiness}
            className={`px-4 py-2 rounded-lg font-semibold ${
              deletingBusiness
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {deletingBusiness
              ? lang === "es"
                ? "Eliminando..."
                : "Deleting..."
              : lang === "es"
              ? "Eliminar mi cuenta de negocio"
              : "Delete My Business Account"}
          </button>
        </section>
      )}

      {/* ANIMATION */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>

    </div>
  );
}

 



