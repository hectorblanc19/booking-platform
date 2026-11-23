"use client";

import { useEffect, useRef, useState } from "react";
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
  const [profileSettings, setProfileSettings] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("es");

  // SERVICES
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [additionalServiceIds, setAdditionalServiceIds] = useState([]);
  const [groupBookingMode, setGroupBookingMode] = useState(false);
const [groupConfirmation, setGroupConfirmation] = useState(null);
  const [groupMembers, setGroupMembers] = useState([
    { name: "", serviceIds: [] },
    { name: "", serviceIds: [] },
  ]);

  function updateGroupMemberName(index, name) {
    setGroupMembers((members) =>
      members.map((member, i) =>
        i === index ? { ...member, name } : member
      )
    );
  }

  function toggleGroupMemberService(index, serviceId) {
    const nextMembers = groupMembers.map((member, i) => {
      if (i !== index) return member;

      const serviceIds = member.serviceIds.includes(serviceId)
        ? member.serviceIds.filter((id) => id !== serviceId)
        : [...member.serviceIds, serviceId];

      return { ...member, serviceIds };
    });

    setGroupMembers(nextMembers);
    setAppointmentTime("");

    if (appointmentDate && groupBookingMode) {
      loadAvailableTimes(
        appointmentDate,
        getGroupCombinedService(nextMembers)
      );
    }
  }

  function addGroupMember() {
    if (groupMembers.length >= 5) return;

    setGroupMembers([
      ...groupMembers,
      { name: "", serviceIds: [] },
    ]);

    setAppointmentTime("");
    setAvailableTimes([]);
  }

  function removeGroupMember(index) {
    if (groupMembers.length <= 2) return;

    const nextMembers = groupMembers.filter((_, i) => i !== index);

    setGroupMembers(nextMembers);
    setAppointmentTime("");
    setAvailableTimes([]);

    if (appointmentDate && groupBookingMode) {
      const combinedService = getGroupCombinedService(nextMembers);

      if (combinedService) {
        loadAvailableTimes(appointmentDate, combinedService);
      }
    }
  }
  // APPOINTMENT FORM
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [savingAppointment, setSavingAppointment] = useState(false);
  const bookingLockRef = useRef(false);
  const pendingBookingRef = useRef(null);

  // PROVIDER AVAILABILITY
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);
  const [tourSeatsRemaining, setTourSeatsRemaining] = useState({});

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

const isBarberCategory =
  normalizedCategory.includes("barber") ||
  normalizedCategory.includes("barbero") ||
  normalizedCategory.includes("barbería") ||
  normalizedCategory.includes("barberia");

// Legacy barber businesses keep the old booking flow.
// New barber businesses with booking_system = "provider"
// use the new provider booking flow.
const isBarberBusiness =
  isBarberCategory && business?.booking_system !== "provider";

const isTourBusiness =
  normalizedCategory.includes("tour") ||
  normalizedCategory.includes("excursion") ||
  normalizedCategory.includes("excursión");
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
function getBusinessNow(timezone = "America/Santo_Domingo") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
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
    .or(`provider_id.eq.${providerToLoad.id},provider_id.is.null`)
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error loading services:", error);
    setServices([]);
    return;
  }

  setServices(data || []);
}

  function getCombinedService(
    primary = selectedService,
    extraIds = additionalServiceIds
  ) {
    if (!primary || isTourBusiness) return primary;

    const extras = extraIds
      .map((id) => services.find((item) => item.id === id))
      .filter(Boolean);

    return {
      ...primary,
      duration: [primary, ...extras].reduce(
        (total, item) => total + Number(item.duration || 0),
        0
      ),
      price: [primary, ...extras].reduce(
        (total, item) => total + Number(item.price || 0),
        0
      ),
    };
  }

  function getGroupCombinedService(members = groupMembers) {
    if (isTourBusiness || members.length < 2 || members.length > 5) {
      return null;
    }

    const selectedIds = members.flatMap((member) => member.serviceIds);

    if (members.some((member) => member.serviceIds.length === 0)) {
      return null;
    }

    const selectedItems = selectedIds.map((id) =>
      services.find((service) => service.id === id)
    );

    if (selectedItems.some((item) => !item)) {
      return null;
    }

    return {
      duration: selectedItems.reduce(
        (total, item) => total + Number(item.duration || 0),
        0
      ),
      price: selectedItems.reduce(
        (total, item) => total + Number(item.price || 0),
        0
      ),
    };
  }
  function addExtraService(id) {
    if (!id || !selectedService) return;
    if (id === selectedService.id || additionalServiceIds.includes(id)) return;

    const next = [...additionalServiceIds, id];
    setAdditionalServiceIds(next);
    setAppointmentTime("");

    if (appointmentDate) {
      loadAvailableTimes(
        appointmentDate,
        getCombinedService(selectedService, next)
      );
    }
  }

  function removeExtraService(id) {
    const next = additionalServiceIds.filter((item) => item !== id);
    setAdditionalServiceIds(next);
    setAppointmentTime("");

    if (appointmentDate && selectedService) {
      loadAvailableTimes(
        appointmentDate,
        getCombinedService(selectedService, next)
      );
    }
  }

  // LOAD AVAILABLE TIMES USING SELECTED SERVICE DURATION
  async function loadAvailableTimes(date, service = selectedService) {
    if (!date || !provider?.id || !service) {
      setAvailableTimes([]);
      setAppointmentTime("");
      setTourSeatsRemaining({});
      return;
    }

    const serviceDuration = Number(service.duration) || 60;

    setLoadingTimes(true);
    setAppointmentTime("");
    setAvailableTimes([]);
    setTourSeatsRemaining({});
    setDayClosed(false);

    try {
      const businessNow = getBusinessNow(business?.timezone);
      const todayString = businessNow.date;
      const isToday = date === todayString;
      const currentMinutes =
        businessNow.hours * 60 + businessNow.minutes;

      // TOURS USE FIXED DEPARTURE TIMES + GUEST CAPACITY.
      // Multiple customers may book the same departure until capacity is full.
      if (isTourBusiness) {
        const departureTimes = Array.isArray(service.departure_times)
          ? service.departure_times
          : [];

        const maxGuests = Number(service.max_guests_per_departure) || 0;

        if (departureTimes.length === 0 || maxGuests < 1) {
          setDayClosed(true);
          setAvailableTimes([]);
          return;
        }

        const { data: appointments, error: appointmentsError } =
          await supabase
            .from("appointments")
            .select("service_id, service, time, guest_count, status")
            .eq("provider_id", provider.id)
            .eq("date", date)
            .eq("status", "confirmed");

        if (appointmentsError) {
          console.error(
            "Error loading tour reservations:",
            appointmentsError
          );
          setAvailableTimes([]);
          return;
        }

        const seatsByTime = {};
        const availableDepartures = [];

        departureTimes.forEach((departure) => {
          const cleanDeparture = String(departure).slice(0, 5);
          const departureMinutes = timeToMinutes(cleanDeparture);

          // Do not show a departure that has already passed today.
          if (isToday && departureMinutes <= currentMinutes) {
            return;
          }

          const bookedGuests = (appointments || [])
            .filter((appointment) => {
              const sameTime =
                String(appointment.time || "").slice(0, 5) === cleanDeparture;

              // New Tour reservations use service_id. The service-name fallback
              // keeps older Tour reservations counted too.
              const sameService =
                appointment.service_id === service.id ||
                (!appointment.service_id &&
                  appointment.service === service.name);

              return sameTime && sameService;
            })
            .reduce(
              (total, appointment) =>
                total + Math.max(1, Number(appointment.guest_count) || 1),
              0
            );

          const remaining = Math.max(0, maxGuests - bookedGuests);
          seatsByTime[cleanDeparture] = remaining;

          if (remaining > 0) {
            availableDepartures.push(cleanDeparture);
          }
        });

        setTourSeatsRemaining(seatsByTime);
        setAvailableTimes(availableDepartures);
        return;
      }

     // NORMAL PROVIDERS:
// BUSINESS HOURS + PROFESSIONAL HOURS + BLOCKS + APPOINTMENTS
const selectedDate = new Date(`${date}T00:00:00`);
const dayOfWeek = selectedDate.getDay();

// 1. CHECK IF THE BUSINESS IS OPEN THIS DAY
const {
  data: businessHours,
  error: businessHoursError,
} = await supabase
  .from("business_hours")
  .select("open_time, close_time, is_open")
  .eq("business_id", businessId)
  .eq("day_of_week", dayOfWeek)
  .maybeSingle();

if (businessHoursError) {
  console.error(
    "Error loading business hours:",
    businessHoursError
  );

  setAvailableTimes([]);
  return;
}

// If business hours have been configured and this day is closed,
// no professional can receive appointments.
if (businessHours && !businessHours.is_open) {
  setDayClosed(true);
  setAvailableTimes([]);
  return;
}

// 2. CHECK PROFESSIONAL AVAILABILITY
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
        console.error("Error loading appointments:", appointmentsError);
        setAvailableTimes([]);
        return;
      }

      const existingAppointments = appointments || [];

      const { data: providerBlocks, error: blocksError } = await supabase
        .from("provider_blocks")
        .select("start_time, end_time")
        .eq("provider_id", provider.id)
        .eq("date", date);

      if (blocksError) {
        console.error("Error loading provider blocks:", blocksError);
        setAvailableTimes([]);
        return;
      }

      const existingBlocks = providerBlocks || [];


const providerStartMinutes = timeToMinutes(
  availability.start_time
);

const providerEndMinutes = timeToMinutes(
  availability.end_time
);

// Appointments must stay inside BOTH:
// 1. Business/store hours
// 2. Professional hours
const businessStartMinutes =
  businessHours?.is_open && businessHours?.open_time
    ? timeToMinutes(businessHours.open_time)
    : providerStartMinutes;

const businessEndMinutes =
  businessHours?.is_open && businessHours?.close_time
    ? timeToMinutes(businessHours.close_time)
    : providerEndMinutes;

const startMinutes = Math.max(
  providerStartMinutes,
  businessStartMinutes
);

const endMinutes = Math.min(
  providerEndMinutes,
  businessEndMinutes
);

const slots = [];

if (endMinutes <= startMinutes) {
  setDayClosed(true);
  setAvailableTimes([]);
  return;
}
         for (
        let current = startMinutes;
        current + serviceDuration <= endMinutes;
        current += SLOT_INTERVAL
      ) {
        if (isToday && current <= currentMinutes) {
          continue;
        }

        const slotTime = minutesToTime(current);

        const hasAppointmentConflict = existingAppointments.some(
  (appointment) =>
    appointmentsOverlap(
      slotTime,
      serviceDuration,
      appointment.time,
      Number(appointment.duration) || 60
    )
);

const hasBlockConflict = existingBlocks.some((block) => {
  const blockStart = timeToMinutes(block.start_time);
  const blockEnd = timeToMinutes(block.end_time);

  const slotStart = timeToMinutes(slotTime);
  const slotEnd = slotStart + serviceDuration;

  return slotStart < blockEnd && slotEnd > blockStart;
});

if (!hasAppointmentConflict && !hasBlockConflict) {
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
    setAdditionalServiceIds([]);
    setAppointmentTime("");

    if (appointmentDate && service) {
      loadAvailableTimes(appointmentDate, service);
    } else {
      setAvailableTimes([]);
    }
  }

 async function saveAppointment() {
    if (groupBookingMode && !isTourBusiness) {
      if (bookingLockRef.current) return;

      const members = groupMembers.map((member) => ({
        name: member.name.trim(),
        serviceIds: member.serviceIds,
      }));

      if (
        !provider?.id ||
        !appointmentDate ||
        !appointmentTime ||
        !customerName.trim() ||
        !customerPhone.trim() ||
        members.length < 2 ||
        members.length > 5 ||
        members.some((member) => !member.name || !member.serviceIds.length)
      ) {
        alert(
          lang === "es"
            ? "Completa los datos de todas las personas y selecciona fecha y hora."
            : "Complete every person's details and select a date and time."
        );
        return;
      }

      const details = JSON.stringify({
        businessId,
        providerId: provider.id,
        appointmentDate,
        appointmentTime,
        members,
        customerName,
        customerPhone,
        customerEmail,
      });

      if (pendingBookingRef.current?.details !== details) {
        pendingBookingRef.current = {
          details,
          id: crypto.randomUUID(),
        };
      }

      bookingLockRef.current = true;
      setSavingAppointment(true);

      try {
        const response = await fetch("/api/book-group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business_id: businessId,
            provider_id: provider.id,
            date: appointmentDate,
            time: appointmentTime,
            members,
            customer_name: customerName.trim(),
            customer_phone: customerPhone.trim(),
            customer_email: customerEmail.trim() || null,
            booking_request_id: pendingBookingRef.current.id,
            lang,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          if (
            result.code === "SLOT_TAKEN" ||
            result.code === "PROVIDER_BLOCKED"
          ) {
            alert(
              lang === "es"
                ? "Ese horario ya no está disponible. Selecciona otra hora."
                : "That time is no longer available. Select another time."
            );
            await loadAvailableTimes(appointmentDate, getGroupCombinedService());
          } else {
            alert(
              lang === "es"
                ? "No se pudo completar la reserva del grupo. Intenta otra vez."
                : "Could not complete the group booking. Please try again."
            );
          }
          return;
        }

        if (!Array.isArray(result.appointments) ||
            result.appointments.length !== members.length) {
          throw new Error("Incomplete group booking response");
        }

        setGroupConfirmation({
          groupId: result.group_id,
          businessName: business?.name || "",
          appointments: [...result.appointments].sort((a, b) =>
            String(a.time).localeCompare(String(b.time))
          ),
        });
      } catch (error) {
        console.error("Group booking error:", error);
        alert(
          lang === "es"
            ? "No se pudo verificar la reserva. Intenta otra vez."
            : "Could not verify the booking. Please try again."
        );
      } finally {
        bookingLockRef.current = false;
        setSavingAppointment(false);
      }

      return;
    }
    // Prevent multiple rapid clicks from creating duplicate bookings
    if (bookingLockRef.current) {
      return;
    }

// CHECK BUSINESS STATUS BEFORE BOOKING
const { data: currentBusiness, error: businessStatusError } =
  await supabase
    .from("businesses")
    .select("is_blocked")
    .eq("id", businessId)
    .single();

if (businessStatusError || !currentBusiness) {
  alert(
    lang === "es"
      ? "No se pudo verificar el estado del negocio. Inténtalo nuevamente."
      : "Could not verify the business status. Please try again."
  );
  return;
}

if (currentBusiness.is_blocked === true) {
  alert(
    lang === "es"
      ? "Esta página no está disponible temporalmente. Por favor, comuníquese con la administración."
      : "This page is temporarily unavailable. Please contact administration."
  );
  return;
}

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

    if (
      isTourBusiness &&
      (!guestCount || Number(guestCount) < 1 || !pickupLocation.trim())
    ) {
      alert(
        lang === "es"
          ? "Para reservar un tour, indica la cantidad de personas y el punto de encuentro o recogida."
          : "For a tour booking, enter the number of guests and the meeting or pickup location."
      );

      return;
    }


// RECHECK AVAILABILITY / CAPACITY IMMEDIATELY BEFORE SAVING
const selectedDuration = Number(getCombinedService()?.duration) || 60;

    if (isTourBusiness) {
      const maxGuests = Number(selectedService.max_guests_per_departure) || 0;
      const requestedGuests = Number(guestCount) || 0;
      const configuredDepartures = Array.isArray(selectedService.departure_times)
        ? selectedService.departure_times.map((time) => String(time).slice(0, 5))
        : [];
      const cleanAppointmentTime = String(appointmentTime).slice(0, 5);

      if (!configuredDepartures.includes(cleanAppointmentTime)) {
        alert(
          lang === "es"
            ? "Esa hora ya no está configurada para este tour. Selecciona otra salida."
            : "That departure is no longer configured for this tour. Please select another departure."
        );
        await loadAvailableTimes(appointmentDate, getCombinedService());
        return;
      }

      if (maxGuests < 1) {
        alert(
          lang === "es"
            ? "Este tour todavía no tiene una capacidad configurada."
            : "This tour does not have a guest capacity configured yet."
        );
        return;
      }

      const { data: tourReservations, error: tourCheckError } =
        await supabase
          .from("appointments")
          .select("service_id, service, time, guest_count")
          .eq("provider_id", provider.id)
          .eq("date", appointmentDate)
          .eq("status", "confirmed");

      if (tourCheckError) {
        console.error("Error checking tour capacity:", tourCheckError);
        alert(
          lang === "es"
            ? "No se pudo verificar la capacidad del tour. Intenta otra vez."
            : "Could not verify tour capacity. Please try again."
        );
        return;
      }

      const bookedGuests = (tourReservations || [])
        .filter((appointment) => {
          const sameTime =
            String(appointment.time || "").slice(0, 5) === cleanAppointmentTime;
          const sameService =
            appointment.service_id === selectedService.id ||
            (!appointment.service_id &&
              appointment.service === selectedService.name);
          return sameTime && sameService;
        })
        .reduce(
          (total, appointment) =>
            total + Math.max(1, Number(appointment.guest_count) || 1),
          0
        );

      const remainingGuests = Math.max(0, maxGuests - bookedGuests);

      if (requestedGuests > remainingGuests) {
        alert(
          lang === "es"
            ? remainingGuests > 0
              ? `Solo quedan ${remainingGuests} espacios para esta salida.`
              : "Esta salida ya está llena. Selecciona otra hora o fecha."
            : remainingGuests > 0
            ? `Only ${remainingGuests} spots remain for this departure.`
            : "This departure is full. Please select another time or date."
        );
        await loadAvailableTimes(appointmentDate, getCombinedService());
        return;
      }


} else {
  // FINAL CHECK BEFORE SAVING A NORMAL PROVIDER APPOINTMENT

  // 1. CHECK BUSINESS HOURS AGAIN
  // This protects against the business hours changing
  // after the customer already opened the booking page.
  const selectedDateForSave = new Date(
    `${appointmentDate}T00:00:00`
  );

  const dayOfWeekForSave =
    selectedDateForSave.getDay();

  const {
    data: currentBusinessHours,
    error: businessHoursCheckError,
  } = await supabase
    .from("business_hours")
    .select("open_time, close_time, is_open")
    .eq("business_id", businessId)
    .eq("day_of_week", dayOfWeekForSave)
    .maybeSingle();

  if (businessHoursCheckError) {
    console.error(
      "Error checking business hours:",
      businessHoursCheckError
    );

    alert(
      lang === "es"
        ? "No se pudo verificar el horario del negocio. Intenta otra vez."
        : "Could not verify the business hours. Please try again."
    );

    return;
  }

  // If business hours exist and the business is now closed,
  // do not allow the appointment to be saved.
  if (
    currentBusinessHours &&
    !currentBusinessHours.is_open
  ) {
    alert(
      lang === "es"
        ? "El negocio está cerrado este día. Selecciona otra fecha."
        : "The business is closed on this day. Please select another date."
    );

    setAppointmentTime("");

    await loadAvailableTimes(appointmentDate, getCombinedService());

    return;
  }

  // Make sure the appointment still fits completely
  // inside the current business/store hours.
  if (
    currentBusinessHours?.is_open &&
    currentBusinessHours?.open_time &&
    currentBusinessHours?.close_time
  ) {
    const businessOpenMinutes =
      timeToMinutes(currentBusinessHours.open_time);

    const businessCloseMinutes =
      timeToMinutes(currentBusinessHours.close_time);

    const selectedStartMinutes =
      timeToMinutes(appointmentTime);

    const selectedEndMinutes =
      selectedStartMinutes + selectedDuration;

    if (
      selectedStartMinutes < businessOpenMinutes ||
      selectedEndMinutes > businessCloseMinutes
    ) {
      alert(
        lang === "es"
          ? "Este horario ya no está dentro del horario del negocio. Selecciona otra hora."
          : "This time is no longer within the business hours. Please select another time."
      );

      setAppointmentTime("");

      await loadAvailableTimes(appointmentDate, getCombinedService());

      return;
    }
  }

  // 2. CHECK EXISTING APPOINTMENTS
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
    console.error("Error checking appointments:", checkError);

    alert(
      lang === "es"
        ? "No se pudo verificar el horario. Intenta otra vez."
        : "Could not verify the appointment time. Please try again."
    );

    return;
  }

  const hasAppointmentConflict = (currentAppointments || []).some(
    (appointment) =>
      appointmentsOverlap(
        appointmentTime,
        selectedDuration,
        appointment.time,
        Number(appointment.duration) || 60
      )
  );

  if (hasAppointmentConflict) {
    alert(
      lang === "es"
        ? "Ese horario acaba de ser reservado o entra en conflicto con otra cita. Selecciona otra hora."
        : "That time was just booked or conflicts with another appointment. Please select another time."
    );

    await loadAvailableTimes(appointmentDate, getCombinedService());

    return;
  }

  // 3. CHECK PROVIDER BLOCKS AGAIN
  // This protects against a block being created after
  // the customer already opened the booking page.
  const {
    data: currentProviderBlocks,
    error: blockCheckError,
  } = await supabase
    .from("provider_blocks")
    .select("start_time, end_time")
    .eq("provider_id", provider.id)
    .eq("date", appointmentDate);

  if (blockCheckError) {
    console.error("Error checking provider blocks:", blockCheckError);
    alert(
      lang === "es"
        ? "No se pudo verificar la disponibilidad del profesional. Intenta otra vez."
        : "Could not verify the provider's availability. Please try again."
    );
    return;
  }
const appointmentStart =
    timeToMinutes(appointmentTime);

  const appointmentEnd =
    appointmentStart + selectedDuration;

  const hasBlockConflict = (
    currentProviderBlocks || []
  ).some((block) => {
    const blockStart =
      timeToMinutes(block.start_time);

    const blockEnd =
      timeToMinutes(block.end_time);

    return (
      appointmentStart < blockEnd &&
      appointmentEnd > blockStart
    );
  });

  if (hasBlockConflict) {
    alert(
      lang === "es"
        ? "Este horario acaba de ser bloqueado por el profesional. Selecciona otra hora."
        : "This time was just blocked by the provider. Please select another time."
    );

    setAppointmentTime("");

    await loadAvailableTimes(appointmentDate, getCombinedService());

    return;
  }
}


   setSavingAppointment(true);

// Lock only when we are actually ready to create the appointment.
bookingLockRef.current = true;

try {
  let createdAppointment = null;

  // =========================================================
  // TOURS
  // Keep the existing tour booking system unchanged.
  // =========================================================
  if (isTourBusiness) {
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        business_id: businessId,
        barber_id: null,
        provider_id: provider.id,
        service_id: selectedService.id,
        is_group_booking: true,
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
        guest_count: Number(guestCount),
        pickup_location: pickupLocation.trim(),
        status: "confirmed",
        lang: lang,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating tour appointment:", error);

      alert(
        lang === "es"
          ? "Error creando la cita"
          : "Error creating appointment"
      );

      return;
    }

    createdAppointment = data;
  } else {
    // =========================================================
    // NORMAL PROVIDER BOOKING
    // Use the protected server API for all current and future
    // provider-based businesses.
    // =========================================================

    const bookingDetails = JSON.stringify({
      businessId,
      providerId: provider.id,
      serviceId: selectedService.id,
      serviceIds: [selectedService.id, ...additionalServiceIds],
      date: appointmentDate,
      time: appointmentTime,
      duration: selectedDuration,
      customerName,
      customerPhone,
      customerEmail,
    });

    if (pendingBookingRef.current?.details !== bookingDetails) {
      pendingBookingRef.current = {
        details: bookingDetails,
        id: crypto.randomUUID(),
      };
    }

    const bookingRequestId = pendingBookingRef.current.id;

    const response = await fetch("/api/book", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_id: businessId,
        provider_id: provider.id,
        service_id: selectedService.id,
        service_ids: [
          selectedService.id,
          ...additionalServiceIds,
        ],

        service: selectedService.name,
        date: appointmentDate,
        time: appointmentTime,
        duration: selectedDuration,

        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail || null,

        notes: "",
        lang: lang,

        price:
          selectedService.price !== null
            ? Number(selectedService.price)
            : 0,

        booking_request_id: bookingRequestId,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error("Booking API error:", result);

      if (
        result.code === "SLOT_TAKEN" ||
        result.code === "PROVIDER_BLOCKED"
      ) {
        alert(
          lang === "es"
            ? "Ese horario acaba de ser reservado o ya no está disponible. Selecciona otra hora."
            : "That time was just booked or is no longer available. Please select another time."
        );

        await loadAvailableTimes(appointmentDate, getCombinedService());
      } else {
        alert(
          lang === "es"
            ? "No se pudo crear la cita. Intenta otra vez."
            : "Could not create the appointment. Please try again."
        );
      }

      return;
    }

    createdAppointment = result.appointment;
  }


// =========================================================
// TOUR NOTIFICATIONS
// Normal provider bookings already send notifications
// through /api/book, so only tours use the old notification
// code here.
// =========================================================
if (isTourBusiness) {
  // SEND CONFIRMATION EMAIL TO CUSTOMER
  if (customerEmail) {
    try {
      const confirmationResponse = await fetch(
        "/api/send-confirmation",
        {
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

            guest_count: Number(guestCount),
            pickup_location: pickupLocation.trim(),
            is_group_booking: true,
          }),
        }
      );

      const confirmationData =
        await confirmationResponse.json();

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


}

alert(
  lang === "es"
    ? "Cita creada correctamente"
    : "Appointment created successfully"
);

// /api/book creates a real secret_link for normal provider
// appointments. Tours still use the appointment id.
if (!isTourBusiness && createdAppointment?.secret_link) {
  router.push(
    `/customer/${createdAppointment.secret_link}`
  );
} else {
  router.push(`/customer/${createdAppointment.id}`);
}
} catch (error) {
  console.error(
    "Unexpected appointment creation error:",
    error
  );

  alert(
    lang === "es"
      ? "No se pudo crear la cita. Intenta otra vez."
      : "Could not create the appointment. Please try again."
  );
} finally {
  bookingLockRef.current = false;
  setSavingAppointment(false);
}
}

  async function loadData() {
    setLoading(true);

    try {

   const { data: biz } = await supabase
  .from("businesses")
  .select("*")
  .eq("id", businessId)
  .single();

setBusiness(biz || null);

// LOAD CUSTOM BUSINESS PROFILE SETTINGS
const { data: settings, error: settingsError } = await supabase
  .from("business_profile_settings")
  .select("logo_url")
  .eq("business_id", businessId)
  .maybeSingle();

if (settingsError) {
  console.error("Business profile settings loading error:", settingsError);
}

setProfileSettings(settings || null);

const { data: bar } = await supabase
      .from("barbers")
      .select("*")
      .eq("business_id", businessId);

    setBarbers(bar || []);

    const { data: prov, error: providerError } =
      await supabase
        .from("providers")
        .select("*")
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
        .select("*")
        .eq("id", providerId)
        .eq("business_id", businessId)
        .maybeSingle();

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
    } catch (error) {
      console.error("Error loading business booking:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p className="p-6">Loading...</p>;
  }

// ==========================================
// BLOCKED BUSINESS SCREEN — ES / EN
// ==========================================
if (business?.is_blocked === true) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center">

        {/* Language selection */}
        <div className="flex justify-center gap-3 mb-6">
          <button
            onClick={() => setLang("es")}
            className={`px-4 py-2 rounded-lg text-sm ${
              lang === "es"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            Español
          </button>

          <button
            onClick={() => setLang("en")}
            className={`px-4 py-2 rounded-lg text-sm ${
              lang === "en"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            English
          </button>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-4">
          {business?.name || "FlowPayDR Booking"}
        </h1>

        <p className="text-gray-700 text-base">
          {lang === "es"
            ? "Esta página no está disponible temporalmente. Por favor, comuníquese con la administración."
            : "This page is temporarily unavailable. Please contact administration."}
        </p>

        <p className="text-xs text-gray-400 mt-6">
          FlowPayDR Booking
        </p>
      </div>
    </div>
  );
}



  if (groupConfirmation) {
    return (
      <div className="min-h-screen bg-gray-100 text-gray-900 p-4 sm:p-6" style={{ colorScheme: "light" }}>
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md p-5 sm:p-7">
          <div className="text-center mb-6">
            <div className="text-4xl text-green-600 mb-3">✓</div>
            <h1 className="text-2xl font-bold text-green-700">
              {lang === "es"
                ? "¡Reserva de grupo confirmada!"
                : "Group booking confirmed!"}
            </h1>
            <p className="text-gray-600 mt-2">
              {groupConfirmation.businessName}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {groupConfirmation.appointments.length}{" "}
              {lang === "es" ? "personas" : "people"}
            </p>
          </div>

          <div className="space-y-4">
            {groupConfirmation.appointments.map((appointment, index) => (
              <div
                key={appointment.id || index}
                className="border border-gray-200 rounded-xl p-4"
              >
                <div className="flex justify-between gap-3 items-start">
                  <h2 className="font-semibold text-lg">
                    {appointment.customer_name}
                  </h2>
                  <span className="text-sm font-semibold text-blue-700">
                    {String(appointment.time || "").slice(0, 5)}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mt-2">
                  {appointment.service}
                </p>

                <p className="text-gray-500 text-sm mt-1">
                  {appointment.date}
                </p>

                {appointment.secret_link && (
                  <a
                    href={`/customer/${appointment.secret_link}`}
                    className="block mt-4 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg"
                  >
                    {lang === "es"
                      ? "Ver y gestionar esta cita"
                      : "View and manage this appointment"}
                  </a>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            {lang === "es"
              ? "Cada cita se puede gestionar por separado."
              : "Each appointment can be managed separately."}
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            FlowPayDR Booking
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-6 max-w-xl mx-auto" style={{ colorScheme: "light" }}>

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

      {/* BUSINESS PHOTO / LOGO */}
{(profileSettings?.logo_url || business?.photo_url) && (
  <div className="flex justify-center mb-4">
    <img
      src={profileSettings?.logo_url || business?.photo_url}
      alt={business?.name || "Business"}
      className="w-28 h-28 rounded-2xl object-cover bg-white border border-gray-200 shadow-sm"
    />
  </div>
)}
      {/* BUSINESS NAME */}
      <h1 className="text-3xl font-bold mb-4 text-center">
        {tr.bookAt} {business?.name}
      </h1>

      {/* BUSINESS LOCATION */}
      {(business?.address || business?.phone || business?.map_url) && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
          {business?.address && (
            <p className="text-sm text-gray-700">
              {"\uD83D\uDCCD"} {business.address}
            </p>
          )}

          {business?.phone && (
            <p className="text-sm text-gray-700 mt-1">
              Tel: {business.phone}
            </p>
          )}

          {(business?.map_url || business?.address) && (
            <a
              href={
                business?.map_url ||
                `https://maps.google.com/?q=${encodeURIComponent(
                  business?.address || ""
                )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-blue-600 underline font-medium text-sm"
            >
              {lang === "es"
                ? "Ver ubicación en Google Maps"
                : "Open location in Google Maps"}
            </a>
          )}
        </div>
      )}

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

            {/* TOUR DETAILS */}
            {isTourBusiness && (
              <div className="mb-4 p-4 border border-emerald-200 bg-emerald-50 rounded-xl">
                <p className="font-semibold text-emerald-900 mb-3">
                  {lang === "es" ? "Detalles del tour" : "Tour details"}
                </p>

                <label className="block font-semibold mb-1">
                  {lang === "es" ? "Cantidad de personas" : "Number of guests"}
                </label>

                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  placeholder={lang === "es" ? "Ej. 2" : "Example: 2"}
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="border p-2 rounded w-full mb-3"
                />

                <label className="block font-semibold mb-1">
                  {lang === "es"
                    ? "Punto de encuentro o recogida"
                    : "Meeting or pickup location"}
                </label>

                <input
                  type="text"
                  placeholder={
                    lang === "es"
                      ? "Ej. Lobby del Hotel Caribe"
                      : "Example: Hotel Caribe Lobby"
                  }
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="border p-2 rounded w-full"
                />
              </div>
            )}

            {/* GROUP BOOKING OPTION */}
            {!isTourBusiness && (
              <div className="mb-4 rounded-xl border p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupBookingMode}
                    onChange={(e) => {
                      setGroupBookingMode(e.target.checked);
                      setAppointmentTime("");
                      setAvailableTimes([]);
                      setDayClosed(false);
                      setAppointmentDate("");
                    }}
                    className="h-5 w-5"
                  />
                  <span className="font-semibold">
                    {lang === "es"
                      ? "Reservar para varias personas (2 a 5)"
                      : "Book for multiple people (2 to 5)"}
                  </span>
                </label>

                {groupBookingMode && (
                  <div className="mt-4 space-y-4">
                    {groupMembers.map((member, index) => (
                      <div key={index} className="rounded-lg border p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-semibold">
                            {lang === "es" ? "Persona" : "Person"} {index + 1}
                          </h3>
                          {groupMembers.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeGroupMember(index)}
                              className="text-sm text-red-600 underline"
                            >
                              {lang === "es" ? "Quitar" : "Remove"}
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) =>
                            updateGroupMemberName(index, e.target.value)
                          }
                          placeholder={
                            lang === "es"
                              ? "Nombre de la persona"
                              : "Person's name"
                          }
                          className="mb-3 w-full rounded border p-2"
                        />

                        <p className="mb-2 text-sm font-semibold">
                          {lang === "es" ? "Seleccionar servicios" : "Select services"}
                        </p>

                        <div className="space-y-2">
                          {services.map((service) => (
                            <label
                              key={service.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={member.serviceIds.includes(service.id)}
                                onChange={() =>
                                  toggleGroupMemberService(index, service.id)
                                }
                              />
                              <span>
                                {lang === "en" && service.name_en?.trim()
                                  ? service.name_en
                                  : service.name}
                                {" - "}
                                {service.duration} min
                                {" - "}
                                {formatPrice(service.price)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    {groupMembers.length < 5 && (
                      <button
                        type="button"
                        onClick={addGroupMember}
                        className="w-full rounded-lg border p-3 font-semibold"
                      >
                        {lang === "es" ? "+ Agregar persona" : "+ Add person"}
                      </button>
                    )}

                    <div className="rounded-lg bg-gray-100 p-3 text-sm">
                      <p>
                        <strong>
                          {lang === "es" ? "Duracion total:" : "Total duration:"}
                        </strong>{" "}
                        {groupMembers.reduce(
                          (total, member) =>
                            total +
                            member.serviceIds.reduce(
                              (sum, id) =>
                                sum +
                                (Number(services.find((s) => s.id === id)?.duration) || 0),
                              0
                            ),
                          0
                        )}{" "}
                        min
                      </p>
                      <p>
                        <strong>
                          {lang === "es" ? "Precio total:" : "Total price:"}
                        </strong>{" "}
                        {formatPrice(
                          groupMembers.reduce(
                            (total, member) =>
                              total +
                              member.serviceIds.reduce(
                                (sum, id) =>
                                  sum +
                                  (Number(services.find((s) => s.id === id)?.price) || 0),
                                0
                              ),
                            0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {(!groupBookingMode || isTourBusiness) && (
              <>
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
                  {lang === "en" && service.name_en?.trim()
  ? service.name_en
  : service.name}
                  {service.price !== null
                    ? ` — ${formatPrice(service.price)}`
                    : ""}
                  {` — ${service.duration} min`}
                </option>
              ))}
            </select>

            {selectedService && !isTourBusiness && (
              <div className="mb-3">
                {additionalServiceIds.map((id) => {
                  const item = services.find((service) => service.id === id);
                  if (!item) return null;

                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 p-2 mb-2 border rounded"
                    >
                      <span className="text-sm">
                        {lang === "en" && item.name_en?.trim()
                          ? item.name_en
                          : item.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExtraService(id)}
                        className="text-red-600 text-sm underline"
                      >
                        {lang === "es" ? "Quitar" : "Remove"}
                      </button>
                    </div>
                  );
                })}

                {services.some(
                  (item) =>
                    item.id !== selectedService.id &&
                    !additionalServiceIds.includes(item.id)
                ) && (
                  <select
                    value=""
                    onChange={(e) => addExtraService(e.target.value)}
                    className="border p-2 rounded w-full"
                  >
                    <option value="">
                      {lang === "es"
                        ? "+ Agregar otro servicio"
                        : "+ Add another service"}
                    </option>
                    {services
                      .filter(
                        (item) =>
                          item.id !== selectedService.id &&
                          !additionalServiceIds.includes(item.id)
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {lang === "en" && item.name_en?.trim()
                            ? item.name_en
                            : item.name}
                        </option>
                      ))}
                  </select>
                )}

                {additionalServiceIds.length > 0 && (
                  <div className="mt-3 p-3 border rounded bg-gray-50 text-sm">
                    <p>
                      <strong>
                        {lang === "es" ? "Duracion total:" : "Total duration:"}
                      </strong>{" "}
                      {getCombinedService()?.duration} min
                    </p>
                    <p>
                      <strong>
                        {lang === "es" ? "Precio total:" : "Total price:"}
                      </strong>{" "}
                      {formatPrice(getCombinedService()?.price)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SELECTED SERVICE INFO */}
            {selectedService && (isTourBusiness || additionalServiceIds.length === 0) && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-semibold">
                  {lang === "en" && selectedService.name_en?.trim()
  ? selectedService.name_en
  : selectedService.name}
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

                {((lang === "en" && selectedService.description_en?.trim()) || selectedService.description) && (
                  <p className="text-sm text-gray-600 mt-2">
                    {lang === "en" && selectedService.description_en?.trim()
  ? selectedService.description_en
  : selectedService.description}
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

              </>
            )}

            {/* DATE */}
            <label className="block font-semibold mb-1">
              {lang === "es" ? "Fecha" : "Date"}
            </label>

            <input
              type="date"
              value={appointmentDate}
              min={getBusinessNow(business?.timezone).date}
              onChange={(e) => {
                const selectedDate = e.target.value;

                setAppointmentDate(selectedDate);
                setAppointmentTime("");

                const bookingService =
                  groupBookingMode && !isTourBusiness
                    ? getGroupCombinedService()
                    : getCombinedService();

                if (bookingService) {
                  loadAvailableTimes(selectedDate, bookingService);
                } else {
                  setAvailableTimes([]);
                }
              }}
              className="border p-2 rounded w-full mb-4"
            />

            {/* TELL CUSTOMER TO SELECT SERVICE FIRST */}
            {appointmentDate && !(groupBookingMode && !isTourBusiness ? getGroupCombinedService() : selectedService) && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                {lang === "es"
                  ? "Selecciona un servicio para ver los horarios disponibles."
                  : "Select a service to see the available times."}
              </div>
            )}

            {/* AVAILABLE TIMES */}
            {appointmentDate && (groupBookingMode && !isTourBusiness ? getGroupCombinedService() : selectedService) && (
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
                            <span>{formatTime(time)}</span>
                            {isTourBusiness && (
                              <span className="block text-xs font-normal mt-1">
                                {lang === "es"
                                  ? `${tourSeatsRemaining[time] ?? 0} espacios disponibles`
                                  : `${tourSeatsRemaining[time] ?? 0} spots available`}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
              </div>
            )}

            {/* GROUP APPOINTMENT SCHEDULE PREVIEW */}
            {groupBookingMode &&
              !isTourBusiness &&
              appointmentTime &&
              getGroupCombinedService() && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <p className="font-semibold text-blue-900 mb-2">
                    {lang === "es"
                      ? "Horario de cada persona"
                      : "Schedule for each person"}
                  </p>

                  {(() => {
                    const [hours, minutes] = appointmentTime.split(":").map(Number);
                    let currentMinutes = hours * 60 + minutes;

                    const formatTime = (totalMinutes) => {
                      const h = Math.floor(totalMinutes / 60) % 24;
                      const m = totalMinutes % 60;
                      const suffix = h >= 12 ? "PM" : "AM";
                      return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
                    };

                    return groupMembers.map((member, index) => {
                      const memberServices = member.serviceIds
                        .map((id) => services.find((service) => service.id === id))
                        .filter(Boolean);

                      const duration = memberServices.reduce(
                        (sum, service) => sum + Number(service.duration || 0),
                        0
                      );

                      const start = currentMinutes;
                      currentMinutes += duration;

                      return (
                        <div
                          key={index}
                          className="border-b border-blue-200 py-2 last:border-b-0"
                        >
                          <p className="font-medium">
                            {member.name.trim() ||
                              `${lang === "es" ? "Persona" : "Person"} ${index + 1}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {memberServices.map((service) => service.name).join(" + ")}
                          </p>
                          <p className="text-sm font-semibold text-blue-900">
                            {formatTime(start)} – {formatTime(currentMinutes)}
                          </p>
                        </div>
                      );
                    });
                  })()}

                  <p className="mt-3 text-sm font-semibold">
                    {lang === "es" ? "Duración total" : "Total duration"}:{" "}
                    {getGroupCombinedService().duration} min
                    {" · "}
                    RD${getGroupCombinedService().price}
                  </p>
                </div>
              )}
            {/* SELECTED APPOINTMENT SUMMARY */}
            {appointmentTime && selectedService && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-semibold text-green-800">
                  {!isTourBusiness && additionalServiceIds.length > 0
                    ? [
                        selectedService,
                        ...services.filter((service) =>
                          additionalServiceIds.includes(service.id)
                        ),
                      ]
                        .map((service) =>
                          lang === "en" && service.name_en?.trim()
                            ? service.name_en
                            : service.name
                        )
                        .join(" + ")
                    : lang === "en" && selectedService.name_en?.trim()
                    ? selectedService.name_en
                    : selectedService.name}
                </p>

                <p className="text-sm text-green-700 mt-1">
                  {formatTime(appointmentTime)}
                  {" \u2022 "}
                  {getCombinedService()?.duration} min
                  {getCombinedService()?.price != null &&
                    ` \u2022 ${formatPrice(getCombinedService().price)}`}
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
                !(groupBookingMode && !isTourBusiness ? getGroupCombinedService() : selectedService) ||
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
                  <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                    {providerItem.photo_url ||
                    providerItem.avatar_url ||
                    providerItem.image_url ? (
                      <img
                        src={
                          providerItem.photo_url ||
                          providerItem.avatar_url ||
                          providerItem.image_url
                        }
                        alt={providerItem.name || "Provider"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">ðŸ‘¤</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-xl font-semibold">
                      {providerItem.name}
                    </p>

                    {providerItem.specialty && (
                      <p className="text-gray-500">
                        {lang === "en" && providerItem.specialty_en?.trim()
  ? providerItem.specialty_en
  : providerItem.specialty}
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

            {providers.length === 0 && (
        <p className="mt-4 text-red-600 text-center">
          {lang === "es"
            ? "No hay profesionales disponibles para este negocio."
            : "No providers found for this business."}
        </p>
      )}
       </div>
  );
}
