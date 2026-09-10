"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import QRCode from "react-qr-code";

export default function BusinessBookingPage() {
  const { businessId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const providerId = searchParams.get("provider");
  const startBooking = searchParams.get("start") === "true";

  const [business, setBusiness] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("en");

  // SERVICES
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);

  // APPOINTMENT FORM
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);

  // PROVIDER AVAILABILITY
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);

  // STARTING TIMES EVERY 30 MINUTES
  const SLOT_INTERVAL = 30;

  const t = {
    en: {
      bookAt: "Book at",
      scanBusiness: "Scan to book this business",
      scanBarber: "Scan to book",
      book: "Book",
    },

    es: {
      bookAt: "Reservar en",
      scanBusiness: "Escanea para reservar este negocio",
      scanBarber: "Escanear para reservar a",
      book: "Reservar",
    },
  };

  const tr = t[lang];

  const normalizedCategory =
    business?.category?.trim().toLowerCase() || "";

  const isBarberBusiness =
    normalizedCategory.includes("barber") ||
    normalizedCategory.includes("barbero") ||
    normalizedCategory.includes("barbería") ||
    normalizedCategory.includes("barberia");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://flowpaydr.com";

  const businessBookingUrl =
    `${baseUrl}/business/${businessId}/booking`;

  useEffect(() => {
  loadData();
}, [businessId, providerId]);

  // FORMAT 24-HOUR TIME INTO 12-HOUR TIME
  function formatTime(time) {
    if (!time) return "";

    const cleanTime = time.slice(0, 5);
    const [hourString, minute] = cleanTime.split(":");

    let hour = Number(hourString);
    const period = hour >= 12 ? "PM" : "AM";

    hour = hour % 12;

    if (hour === 0) {
      hour = 12;
    }

    return `${hour}:${minute} ${period}`;
  }

  // FORMAT PRICE
  function formatPrice(price) {
    if (price === null || price === undefined || price === "") {
      return "";
    }

    return `RD$${Number(price).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function timeToMinutes(time) {
    if (!time) return 0;

    const [hours, minutes] = time
      .slice(0, 5)
      .split(":")
      .map(Number);

    return hours * 60 + minutes;
  }

  function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`;
  }

// DOMINICAN REPUBLIC CURRENT DATE AND TIME
function getDominicanNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hours: Number(values.hour),
    minutes: Number(values.minute),
  };
}


  function appointmentsOverlap(
    candidateStart,
    candidateDuration,
    bookedStart,
    bookedDuration
  ) {
    const candidateStartMinutes =
      timeToMinutes(candidateStart);

    const candidateEndMinutes =
      candidateStartMinutes + candidateDuration;

    const bookedStartMinutes =
      timeToMinutes(bookedStart);

    const bookedEndMinutes =
      bookedStartMinutes + (bookedDuration || 60);

    return (
      candidateStartMinutes < bookedEndMinutes &&
      candidateEndMinutes > bookedStartMinutes
    );
  }

  // LOAD SERVICES FOR THIS PROVIDER
  async function loadServices(providerToLoad) {
    if (!providerToLoad?.id) {
      setServices([]);
      return;
    }

    const { data, error } = await supabase
      .from("business_services")
      .select("*")
      .eq("business_id", businessId)
      .eq("provider_id", providerToLoad.id)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error loading services:", error);
      setServices([]);
      return;
    }

    setServices(data || []);
  }

  // LOAD AVAILABLE TIMES USING SELECTED SERVICE DURATION
  async function loadAvailableTimes(date, service = selectedService) {
    if (!date || !provider?.id || !service) {
      setAvailableTimes([]);
      setAppointmentTime("");
      return;
    }

    const serviceDuration = Number(service.duration) || 60;

    setLoadingTimes(true);
    setAppointmentTime("");
    setAvailableTimes([]);
    setDayClosed(false);

    try {
      const selectedDate = new Date(`${date}T00:00:00`);
const dayOfWeek = selectedDate.getDay();

// CHECK IF SELECTED DATE IS TODAY IN DOMINICAN REPUBLIC
const dominicanNow = getDominicanNow();

const todayString = dominicanNow.date;
const isToday = date === todayString;

const currentMinutes =
  dominicanNow.hours * 60 + dominicanNow.minutes;

      // PROVIDER WORKING HOURS
      const {
        data: availability,
        error: availabilityError,
      } = await supabase
        .from("provider_availability")
        .select("*")
        .eq("provider_id", provider.id)
        .eq("day_of_week", dayOfWeek)
        .eq("is_available", true)
        .maybeSingle();

      if (availabilityError) {
        console.error(
          "Error loading provider availability:",
          availabilityError
        );

        setAvailableTimes([]);
        return;
      }

      if (!availability) {
        setDayClosed(true);
        setAvailableTimes([]);
        return;
      }

      // EXISTING APPOINTMENTS
      const {
        data: appointments,
        error: appointmentsError,
      } = await supabase
        .from("appointments")
        .select("time, duration")
        .eq("provider_id", provider.id)
        .eq("date", date)
        .eq("status", "confirmed");

      if (appointmentsError) {
        console.error(
          "Error loading appointments:",
          appointmentsError
        );

        setAvailableTimes([]);
        return;
      }

      const existingAppointments = appointments || [];

      const startMinutes =
        timeToMinutes(availability.start_time);

      const endMinutes =
        timeToMinutes(availability.end_time);

      const slots = [];

      for (
  let current = startMinutes;
  current + serviceDuration <= endMinutes;
  current += SLOT_INTERVAL
) {
  // DON'T SHOW TIMES THAT ALREADY PASSED TODAY
  if (isToday && current <= currentMinutes) {
    continue;
  }

  const slotTime = minutesToTime(current);

        const hasConflict = existingAppointments.some(
          (appointment) =>
            appointmentsOverlap(
              slotTime,
              serviceDuration,
              appointment.time,
              Number(appointment.duration) || 60
            )
        );

        if (!hasConflict) {
          slots.push(slotTime);
        }
      }

      setAvailableTimes(slots);
    } finally {
      setLoadingTimes(false);
    }
  }

  function handleServiceChange(serviceId) {
    const service =
      services.find((item) => item.id === serviceId) || null;

    setSelectedService(service);
    setAppointmentTime("");

    if (appointmentDate && service) {
      loadAvailableTimes(appointmentDate, service);
    } else {
      setAvailableTimes([]);
    }
  }

  async function saveAppointment() {
    if (
      !customerName ||
      !customerPhone ||
      !selectedService ||
      !appointmentDate ||
      !appointmentTime
    ) {
      alert(
        lang === "es"
          ? "Completa los campos requeridos"
          : "Please complete the required fields"
      );

      return;
    }

    if (!provider) {
      alert(
        lang === "es"
          ? "Profesional no encontrado"
          : "Provider not found"
      );

      return;
    }

    // RECHECK AVAILABILITY BEFORE SAVING
    const {
      data: currentAppointments,
      error: checkError,
    } = await supabase
      .from("appointments")
      .select("time, duration")
      .eq("provider_id", provider.id)
      .eq("date", appointmentDate)
      .eq("status", "confirmed");

    if (checkError) {
      console.error(
        "Error checking appointments:",
        checkError
      );

      alert(
        lang === "es"
          ? "No se pudo verificar el horario. Intenta otra vez."
          : "Could not verify the appointment time. Please try again."
      );

      return;
    }

    const selectedDuration =
      Number(selectedService.duration) || 60;

    const hasConflict = (currentAppointments || []).some(
      (appointment) =>
        appointmentsOverlap(
          appointmentTime,
          selectedDuration,
          appointment.time,
          Number(appointment.duration) || 60
        )
    );

    if (hasConflict) {
      alert(
        lang === "es"
          ? "Ese horario acaba de ser reservado o entra en conflicto con otra cita. Selecciona otra hora."
          : "That time was just booked or conflicts with another appointment. Please select another time."
      );

      await loadAvailableTimes(
        appointmentDate,
        selectedService
      );

      return;
    }

    setSavingAppointment(true);

try {
  const { data: createdAppointment, error } = await supabase
    .from("appointments")
    .insert({
      business_id: businessId,
      barber_id: null,
      provider_id: provider.id,
      service: selectedService.name,
      date: appointmentDate,
      time: appointmentTime,
      duration: selectedDuration,
      price:
        selectedService.price !== null
          ? Number(selectedService.price)
          : null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      status: "confirmed",
      lang: lang,
    })
    .select("id")
    .single();
      if (error) {
        console.error(
          "Error creating appointment:",
          error
        );

        if (error.code === "23505") {
          alert(
            lang === "es"
              ? "Ese horario acaba de ser reservado. Selecciona otra hora."
              : "That time was just booked. Please select another time."
          );

          await loadAvailableTimes(
            appointmentDate,
            selectedService
          );
        } else {
          alert(
            lang === "es"
              ? "Error creando la cita"
              : "Error creating appointment"
          );
        }

        return;
      }

     
// SEND CONFIRMATION EMAIL TO CUSTOMER
if (customerEmail) {
  try {
    const confirmationResponse = await fetch("/api/send-confirmation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_email: customerEmail,
        customer_name: customerName,
        service: selectedService.name,
        barber_id: null,
        provider_id: provider.id,
        business_id: businessId,
        date: appointmentDate,
        time: appointmentTime,
        secret_link: `${baseUrl}/customer/${createdAppointment.id}`,
        lang: lang,
      }),
    });

    const confirmationData = await confirmationResponse.json();

    if (!confirmationData.success) {
      console.error(
        "Confirmation email error:",
        confirmationData
      );
    }
  } catch (emailError) {
    console.error(
      "Confirmation email request failed:",
      emailError
    );
  }
}

// SEND NEW APPOINTMENT EMAIL TO PROVIDER
if (provider?.email) {
  try {
    const providerResponse = await fetch(
      "/api/send-barber-notification",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider_email: provider.email,
          provider_name: provider.name,
          provider_id: provider.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          service: selectedService.name,
          date: appointmentDate,
          time: appointmentTime,
          notes: null,
         dashboard_link: null,
lang: lang,       
 }),
      }
    );

    const providerData = await providerResponse.json();

    if (!providerData.success) {
      console.error(
        "Provider notification email error:",
        providerData
      );
    }
  } catch (providerEmailError) {
    console.error(
      "Provider notification email request failed:",
      providerEmailError
    );
  }
}

alert(
  lang === "es"
    ? "Cita creada correctamente"
    : "Appointment created successfully"
);

router.push(`/customer/${createdAppointment.id}`);    } finally {
      setSavingAppointment(false);
    }
  }

  async function loadData() {
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

    const { data: prov, error: providerError } =
      await supabase
        .from("providers")
        .select("id, name, specialty, email, business_id")
        .eq("business_id", businessId);

    if (providerError) {
      console.error(
        "Provider loading error:",
        providerError
      );
    }

    setProviders(prov || []);

    if (providerId) {
      const {
        data: selectedProvider,
        error: selectedProviderError,
      } = await supabase
        .from("providers")
        .select("id, name, specialty, email, business_id")
        .eq("id", providerId)
        .eq("business_id", businessId)
        .single();

      if (selectedProviderError) {
        console.error(
          "Selected provider loading error:",
          selectedProviderError
        );
      }

      setProvider(selectedProvider || null);

      if (selectedProvider) {
        await loadServices(selectedProvider);
      }
    } else {
      setProvider(null);
      setServices([]);
    }

    setLoading(false);
  }

  if (loading) {
    return <p className="p-6">Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 max-w-xl mx-auto">

      {/* LANGUAGE */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          onClick={() => setLang("en")}
          className={`px-3 py-1 rounded text-sm ${
            lang === "en"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          EN
        </button>

        <button
          onClick={() => setLang("es")}
          className={`px-3 py-1 rounded text-sm ${
            lang === "es"
              ? "bg-blue-600 text-white"
              : "bg-gray-200"
          }`}
        >
          ES
        </button>
      </div>

      {/* BUSINESS NAME */}
      <h1 className="text-3xl font-bold mb-6 text-center">
        {tr.bookAt} {business?.name}
      </h1>

      {/* BUSINESS QR */}
      <div className="mb-8 text-center">
        <p className="font-semibold mb-2">
          {tr.scanBusiness}
        </p>

        <div className="inline-block bg-white p-4 rounded-xl shadow">
          <QRCode
            value={businessBookingUrl}
            size={150}
          />
        </div>

        <p className="text-xs mt-2 text-gray-500 break-all">
          {businessBookingUrl}
        </p>
      </div>

      <div className="space-y-6">
        {startBooking && provider ? (
          <div className="p-4 border rounded-xl shadow bg-white">
            <h2 className="text-2xl font-semibold mb-4">
              {tr.book} {provider.name}
            </h2>

            {/* NAME */}
            <input
              type="text"
              placeholder={
                lang === "es"
                  ? "Nombre del cliente"
                  : "Customer name"
              }
              value={customerName}
              onChange={(e) =>
                setCustomerName(e.target.value)
              }
              className="border p-2 rounded w-full mb-3"
            />

            {/* PHONE */}
            <input
              type="tel"
              placeholder={
                lang === "es"
                  ? "Teléfono del cliente"
                  : "Customer phone"
              }
              value={customerPhone}
              onChange={(e) =>
                setCustomerPhone(e.target.value)
              }
              className="border p-2 rounded w-full mb-3"
            />

            {/* EMAIL */}
            <input
              type="email"
              placeholder={
                lang === "es"
                  ? "Correo del cliente"
                  : "Customer email"
              }
              value={customerEmail}
              onChange={(e) =>
                setCustomerEmail(e.target.value)
              }
              className="border p-2 rounded w-full mb-3"
            />

            {/* SERVICE */}
            <label className="block font-semibold mb-1">
              {lang === "es" ? "Servicio" : "Service"}
            </label>

            <select
              value={selectedService?.id || ""}
              onChange={(e) =>
                handleServiceChange(e.target.value)
              }
              className="border p-2 rounded w-full mb-2"
            >
              <option value="">
                {lang === "es"
                  ? "Selecciona un servicio"
                  : "Select a service"}
              </option>

              {services.map((service) => (
                <option
                  key={service.id}
                  value={service.id}
                >
                  {service.name}
                  {service.price !== null
                    ? ` — ${formatPrice(service.price)}`
                    : ""}
                  {` — ${service.duration} min`}
                </option>
              ))}
            </select>

            {/* SELECTED SERVICE INFO */}
            {selectedService && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold">
                  {selectedService.name}
                </p>

                <div className="flex gap-4 mt-1 text-sm text-gray-700">
                  {selectedService.price !== null && (
                    <span>
                      {lang === "es" ? "Precio:" : "Price:"}{" "}
                      <strong>
                        {formatPrice(selectedService.price)}
                      </strong>
                    </span>
                  )}

                  <span>
                    {lang === "es"
                      ? "Duración:"
                      : "Duration:"}{" "}
                    <strong>
                      {selectedService.duration} min
                    </strong>
                  </span>
                </div>

                {selectedService.description && (
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedService.description}
                  </p>
                )}
              </div>
            )}

            {services.length === 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                {lang === "es"
                  ? "Este profesional todavía no tiene servicios disponibles."
                  : "This provider does not have any available services yet."}
              </div>
            )}

            {/* DATE */}
            <label className="block font-semibold mb-1">
              {lang === "es" ? "Fecha" : "Date"}
            </label>

            <input
              type="date"
              value={appointmentDate}
              min={getDominicanNow().date}
              onChange={(e) => {
                const selectedDate = e.target.value;

                setAppointmentDate(selectedDate);
                setAppointmentTime("");

                if (selectedService) {
                  loadAvailableTimes(
                    selectedDate,
                    selectedService
                  );
                } else {
                  setAvailableTimes([]);
                }
              }}
              className="border p-2 rounded w-full mb-4"
            />

            {/* TELL CUSTOMER TO SELECT SERVICE FIRST */}
            {appointmentDate && !selectedService && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                {lang === "es"
                  ? "Selecciona un servicio para ver los horarios disponibles."
                  : "Select a service to see the available times."}
              </div>
            )}

            {/* AVAILABLE TIMES */}
            {appointmentDate && selectedService && (
              <div className="mb-4">
                <p className="font-semibold mb-2">
                  {lang === "es"
                    ? "Horarios disponibles"
                    : "Available times"}
                </p>

                {loadingTimes && (
                  <p className="text-sm text-gray-500">
                    {lang === "es"
                      ? "Consultando horarios..."
                      : "Checking available times..."}
                  </p>
                )}

                {!loadingTimes && dayClosed && (
                  <div className="p-3 rounded-lg bg-gray-100 text-gray-600">
                    {lang === "es"
                      ? "Este profesional no trabaja este día. Selecciona otra fecha."
                      : "This provider is not working on this day. Please select another date."}
                  </div>
                )}

                {!loadingTimes &&
                  !dayClosed &&
                  availableTimes.length === 0 && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-700">
                      {lang === "es"
                        ? "No quedan horarios disponibles para este servicio en este día."
                        : "There are no available times for this service on this day."}
                    </div>
                  )}

                {!loadingTimes &&
                  availableTimes.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableTimes.map((time) => {
                        const selected =
                          appointmentTime === time;

                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() =>
                              setAppointmentTime(time)
                            }
                            className={`border rounded-lg px-3 py-2 text-sm font-semibold transition ${
                              selected
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white hover:bg-blue-50 border-gray-300"
                            }`}
                          >
                            {formatTime(time)}
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            )}

            {/* SELECTED APPOINTMENT SUMMARY */}
            {appointmentTime && selectedService && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-semibold text-green-800">
                  {selectedService.name}
                </p>

                <p className="text-sm text-green-700 mt-1">
                  {formatTime(appointmentTime)}
                  {" • "}
                  {selectedService.duration} min
                  {selectedService.price !== null &&
                    ` • ${formatPrice(
                      selectedService.price
                    )}`}
                </p>
              </div>
            )}

            {/* SAVE */}
            <button
              type="button"
              onClick={saveAppointment}
              disabled={
                savingAppointment ||
                loadingTimes ||
                !selectedService ||
                !appointmentTime
              }
              className="w-full bg-green-600 text-white py-2 rounded-lg disabled:opacity-50"
            >
              {savingAppointment
                ? lang === "es"
                  ? "Guardando..."
                  : "Saving..."
                : lang === "es"
                ? "Guardar Cita"
                : "Save Appointment"}
            </button>
          </div>
        ) : isBarberBusiness ? (
          barbers.map((b) => {
            const barberBookingUrl =
              `${baseUrl}/booking/${b.id}`;

            return (
              <div
                key={b.id}
                className="p-4 border rounded-xl shadow bg-white"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={
                      b.photo_url ||
                      "/default-barber.png"
                    }
                    alt={b.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />

                  <div className="flex-1">
                    <p className="text-xl font-semibold">
                      {b.name}
                    </p>

                    <p className="text-gray-500">
                      {b.email}
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm font-medium mb-1">
                    {tr.scanBarber} {b.name}
                  </p>

                  <div className="inline-block bg-white p-3 rounded-xl shadow">
                    <QRCode
                      value={barberBookingUrl}
                      size={120}
                    />
                  </div>

                  <p className="text-xs mt-2 text-gray-500 break-all">
                    {barberBookingUrl}
                  </p>
                </div>

                <button
                  onClick={() =>
                    router.push(`/booking/${b.id}`)
                  }
                  className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg"
                >
                  {tr.book} {b.name}
                </button>
              </div>
            );
          })
        ) : (
          providers.map((providerItem) => {
            const providerBookingUrl =
              `${baseUrl}/business/${businessId}/booking?provider=${providerItem.id}`;

            return (
              <div
                key={providerItem.id}
                className="p-4 border rounded-xl shadow bg-white"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                    👨‍⚕️
                  </div>

                  <div className="flex-1">
                    <p className="text-xl font-semibold">
                      {providerItem.name}
                    </p>

                    {providerItem.specialty && (
                      <p className="text-gray-500">
                        {providerItem.specialty}
                      </p>
                    )}

                    {providerItem.email && (
                      <p className="text-gray-500">
                        {providerItem.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm font-medium mb-1">
                    {tr.scanBarber} {providerItem.name}
                  </p>

                  <div className="inline-block bg-white p-3 rounded-xl shadow">
                    <QRCode
                      value={providerBookingUrl}
                      size={120}
                    />
                  </div>

                  <p className="text-xs mt-2 text-gray-500 break-all">
                    {providerBookingUrl}
                  </p>
                </div>

                <button
                  onClick={() =>
                    router.push(
                      `/business/${businessId}/booking?provider=${providerItem.id}&start=true`
                    )
                  }
                  className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg"
                >
                  {tr.book} {providerItem.name}
                </button>
              </div>
            );
          })
        )}
      </div>

      {isBarberBusiness && barbers.length === 0 && (
        <p className="mt-4 text-red-600 text-center">
          No barbers found for this business.
        </p>
      )}

      {!isBarberBusiness && providers.length === 0 && (
        <p className="mt-4 text-red-600 text-center">
          No providers found for this business.
        </p>
      )}
    </div>
  );
}