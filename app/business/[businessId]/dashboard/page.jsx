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

// Detect whether this business is a barber business
const normalizedCategory = business?.category?.trim().toLowerCase() || "";

const isBarberBusiness =
  normalizedCategory.includes("barber") ||
  normalizedCategory.includes("barbero") ||
  normalizedCategory.includes("barbería") ||
  normalizedCategory.includes("barberia");

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

  async function loadDashboard() {
    setLoading(true);

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();
    setBusiness(biz || null);

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
    <div className="pt-3 border-t">
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
  )}
</div>  
</section>

{/* ADD APPOINTMENT */}
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
{/* BUSINESS QR CODE */}
<BusinessQRCode
  t={t}
  lang={lang}
  businessId={businessId}
/>
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
    {/* PROVIDER AVAILABILITY */}
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

 


