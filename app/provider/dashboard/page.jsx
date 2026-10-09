"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import TodaysSchedule from "@/components/business/TodaysSchedule";
import AllAppointments from "@/components/business/AllAppointments";
import ProviderBlockingPanel from "@/components/ProviderBlockingPanel";

export default function ProviderDashboardPage() {
  const router = useRouter();

  const [lang, setLang] = useState("es");
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState(null);
  const [business, setBusiness] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // --------------------------------------------------
  // ALL APPOINTMENTS FILTERS
  // --------------------------------------------------
  const [filterBarberId, setFilterBarberId] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");

  const [pageByBarber, setPageByBarber] = useState({});
  const [openBarbers, setOpenBarbers] = useState({});

  const APPOINTMENTS_PER_PAGE = 20;

  // --------------------------------------------------
  // PROVIDER AVAILABILITY
  // --------------------------------------------------
  const [providerAvailability, setProviderAvailability] = useState([]);
  const [savingProviderAvailability, setSavingProviderAvailability] =
    useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  const text = {
    es: {
      todaysSchedule: "Agenda de Hoy",
      noAppointmentsToday: "No hay citas para hoy.",
    },

    en: {
      todaysSchedule: "Today's Schedule",
      noAppointmentsToday: "No appointments for today.",
    },
  };

  // --------------------------------------------------
  // GET TODAY IN DOMINICAN REPUBLIC
  // --------------------------------------------------
  function getDominicanToday() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Santo_Domingo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const values = {};

    parts.forEach((part) => {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    });

    return `${values.year}-${values.month}-${values.day}`;
  }

  // --------------------------------------------------
  // DEFAULT WEEK
  // --------------------------------------------------
  function createDefaultAvailability(existingRows = []) {
    return Array.from({ length: 7 }, (_, dayOfWeek) => {
      const existing = existingRows.find(
        (row) => Number(row.day_of_week) === dayOfWeek
      );

      if (existing) {
        return {
          ...existing,
          start_time: existing.start_time || "09:00",
          end_time: existing.end_time || "18:00",
          is_available: existing.is_available !== false,
        };
      }

      return {
        id: `new-${dayOfWeek}`,
        day_of_week: dayOfWeek,
        start_time: "09:00",
        end_time: "18:00",
        is_available: true,
      };
    });
  }

  // --------------------------------------------------
  // LOAD PROVIDER AVAILABILITY
  // --------------------------------------------------
  async function loadProviderAvailability(providerId) {
    if (!providerId) return;

    const { data, error } = await supabase
      .from("provider_availability")
      .select("*")
      .eq("provider_id", providerId)
      .order("day_of_week", { ascending: true });

    if (error) {
      console.error("Provider availability load error:", error);

      setAvailabilityMessage(
        lang === "es"
          ? "No se pudo cargar tu horario."
          : "Could not load your schedule."
      );

      return;
    }

    setProviderAvailability(
      createDefaultAvailability(data || [])
    );
  }

  // --------------------------------------------------
  // SAVE PROVIDER AVAILABILITY
  // --------------------------------------------------
  async function saveProviderAvailability() {
    if (!provider?.id) return;

    setSavingProviderAvailability(true);
    setAvailabilityMessage("");

    try {
      // Remove the current weekly schedule for this provider only.
      const { error: deleteError } = await supabase
        .from("provider_availability")
        .delete()
        .eq("provider_id", provider.id);

      if (deleteError) {
        throw deleteError;
      }

      const rows = providerAvailability.map((day) => ({
        provider_id: provider.id,
        day_of_week: Number(day.day_of_week),
        start_time: day.start_time || "09:00",
        end_time: day.end_time || "18:00",
        is_available: Boolean(day.is_available),
      }));

      const { error: insertError } = await supabase
        .from("provider_availability")
        .insert(rows);

      if (insertError) {
        throw insertError;
      }

      await loadProviderAvailability(provider.id);

      setAvailabilityMessage(
        lang === "es"
          ? "Horario guardado correctamente."
          : "Schedule saved successfully."
      );
    } catch (error) {
      console.error("Provider availability save error:", error);

      setAvailabilityMessage(
        lang === "es"
          ? "No se pudo guardar tu horario."
          : "Could not save your schedule."
      );
    } finally {
      setSavingProviderAvailability(false);
    }
  }

  // --------------------------------------------------
  // LOAD PROFESSIONAL DASHBOARD
  // --------------------------------------------------
  useEffect(() => {
    let mounted = true;

    async function loadProviderDashboard() {
      try {
        // 1. GET LOGGED-IN USER
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (mounted) {
            router.replace("/provider/login");
          }

          return;
        }

        // 2. FIND PROVIDER CONNECTED TO USER
        const { data: providerData, error: providerError } =
          await supabase
            .from("providers")
            .select(
              `
                id,
                business_id,
                name,
                email,
                phone,
                specialty,
                photo_url,
                user_id,
                dashboard_access,
                access_status
              `
            )
            .eq("user_id", user.id)
            .eq("dashboard_access", true)
            .eq("access_status", "active")
            .maybeSingle();

        if (providerError) {
          console.error(
            "Professional lookup error:",
            providerError
          );

          if (mounted) {
            setErrorMessage(
              lang === "es"
                ? "No se pudo cargar tu cuenta profesional."
                : "Could not load your professional account."
            );

            setLoading(false);
          }

          return;
        }

        if (!providerData) {
          await supabase.auth.signOut();

          if (mounted) {
            router.replace("/provider/login");
          }

          return;
        }

        // 3. LOAD BUSINESS
        const { data: businessData, error: businessError } =
          await supabase
            .from("businesses")
            .select("id, name")
            .eq("id", providerData.business_id)
            .maybeSingle();

        if (businessError) {
          console.error(
            "Business lookup error:",
            businessError
          );
        }

        // 4. LOAD ONLY THIS PROFESSIONAL'S APPOINTMENTS
        const {
          data: appointmentData,
          error: appointmentError,
        } = await supabase
          .from("appointments")
          .select("*")
          .eq("business_id", providerData.business_id)
          .eq("provider_id", providerData.id)
          .order("date", { ascending: true })
          .order("time", { ascending: true });

        if (appointmentError) {
          console.error(
            "Professional appointments error:",
            appointmentError
          );

          if (mounted) {
            setErrorMessage(
              lang === "es"
                ? "No se pudieron cargar tus citas."
                : "Could not load your appointments."
            );

            setLoading(false);
          }

          return;
        }

        if (!mounted) return;

        setProvider(providerData);
        setBusiness(businessData || null);
        setAppointments(appointmentData || []);

        // Professional is always locked to himself.
        setFilterBarberId(providerData.id);

        // Load only this professional's weekly schedule.
        const { data: availabilityData, error: availabilityError } =
          await supabase
            .from("provider_availability")
            .select("*")
            .eq("provider_id", providerData.id)
            .order("day_of_week", { ascending: true });

        if (availabilityError) {
          console.error(
            "Provider availability load error:",
            availabilityError
          );
        }

        setProviderAvailability(
          createDefaultAvailability(availabilityData || [])
        );

        setLoading(false);
      } catch (error) {
        console.error(
          "Professional dashboard error:",
          error
        );

        if (mounted) {
          setErrorMessage(
            lang === "es"
              ? "Ocurrió un error cargando el panel."
              : "An error occurred while loading the dashboard."
          );

          setLoading(false);
        }
      }
    }

    loadProviderDashboard();

    return () => {
      mounted = false;
    };
  }, [router, lang]);

  // --------------------------------------------------
  // TODAY'S APPOINTMENTS
  // --------------------------------------------------
  const todaysAppointments = useMemo(() => {
    const today = getDominicanToday();

    return appointments.filter(
      (appointment) => appointment.date === today
    );
  }, [appointments]);

  // --------------------------------------------------
  // PROVIDER MAP
  // --------------------------------------------------
  const providerMap = useMemo(() => {
    if (!provider) return {};

    return {
      [provider.id]: provider.name,
    };
  }, [provider]);

  // --------------------------------------------------
  // FILTER ALL APPOINTMENTS
  // --------------------------------------------------
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      if (
        provider &&
        appointment.provider_id !== provider.id
      ) {
        return false;
      }

      if (
        filterDate &&
        appointment.date !== filterDate
      ) {
        return false;
      }

      if (filterMonth !== "all") {
        const monthString = appointment.date?.slice(0, 7);

        if (monthString !== filterMonth) {
          return false;
        }
      }

      return true;
    });
  }, [
    appointments,
    provider,
    filterDate,
    filterMonth,
  ]);

  // --------------------------------------------------
  // GROUP APPOINTMENTS BY PROVIDER
  // --------------------------------------------------
  const groupedByBarber = useMemo(() => {
    const grouped = {};

    filteredAppointments.forEach((appointment) => {
      const personId = appointment.provider_id;

      if (!personId) return;

      if (!grouped[personId]) {
        grouped[personId] = [];
      }

      grouped[personId].push(appointment);
    });

    return grouped;
  }, [filteredAppointments]);

  // --------------------------------------------------
  // OPEN / CLOSE APPOINTMENT GROUP
  // --------------------------------------------------
  function toggleBarberOpen(providerId) {
    setOpenBarbers((previous) => ({
      ...previous,
      [providerId]:
        !(previous[providerId] ?? true),
    }));
  }

  // --------------------------------------------------
  // PAGINATION
  // --------------------------------------------------
  function changeBarberPage(providerId, newPage) {
    setPageByBarber((previous) => ({
      ...previous,
      [providerId]: newPage,
    }));
  }

  // --------------------------------------------------
  // UPDATE AVAILABILITY DAY
  // --------------------------------------------------
  function updateAvailabilityDay(dayOfWeek, field, value) {
    setProviderAvailability((previous) =>
      previous.map((day) =>
        Number(day.day_of_week) === Number(dayOfWeek)
          ? {
              ...day,
              [field]: value,
            }
          : day
      )
    );
  }

  // --------------------------------------------------
  // DAY NAME
  // --------------------------------------------------
  function getDayName(dayOfWeek) {
    const spanishDays = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];

    const englishDays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    return lang === "es"
      ? spanishDays[dayOfWeek]
      : englishDays[dayOfWeek];
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/provider/login");
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-600">
          {lang === "es"
            ? "Cargando panel..."
            : "Loading dashboard..."}
        </p>
      </main>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------
  if (errorMessage) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border rounded-2xl p-6 shadow-sm text-center">
          <p className="text-red-600 mb-5">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="bg-black text-white px-5 py-3 rounded-lg font-semibold"
          >
            {lang === "es"
              ? "Cerrar sesión"
              : "Sign out"}
          </button>
        </div>
      </main>
    );
  }

  if (!provider) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-bold text-xl">
              FLOWPAYDR BOOKING
            </p>

            <p className="text-sm text-gray-500">
              {lang === "es"
                ? "Panel del Profesional"
                : "Professional Dashboard"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
              <button
                type="button"
                onClick={() => setLang("es")}
                className={`px-3 py-2 rounded-full text-sm font-semibold ${
                  lang === "es"
                    ? "bg-black text-white"
                    : "text-gray-600"
                }`}
              >
                ES
              </button>

              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-2 rounded-full text-sm font-semibold ${
                  lang === "en"
                    ? "bg-black text-white"
                    : "text-gray-600"
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
            >
              {lang === "es"
                ? "Cerrar sesión"
                : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* WELCOME */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-1">
            {business?.name ||
              (lang === "es"
                ? "Negocio"
                : "Business")}
          </p>

          <h1 className="text-3xl font-bold">
            {lang === "es"
              ? `Hola, ${provider.name}`
              : `Hello, ${provider.name}`}
          </h1>

          <p className="text-gray-600 mt-2">
            {lang === "es"
              ? "Aquí podrás administrar tus citas y tu disponibilidad."
              : "Here you can manage your appointments and availability."}
          </p>
        </div>

        {/* PROFESSIONAL INFORMATION */}
        <section className="bg-white border rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center gap-4">
            {provider.photo_url ? (
              <img
                src={provider.photo_url}
                alt={provider.name}
                className="w-20 h-20 rounded-full object-cover border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
                👤
              </div>
            )}

            <div>
              <h2 className="text-xl font-bold">
                {provider.name}
              </h2>

              {provider.specialty && (
                <p className="text-gray-600">
                  {provider.specialty}
                </p>
              )}

              {provider.email && (
                <p className="text-sm text-gray-500 mt-1">
                  {provider.email}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* TODAY'S SCHEDULE */}
        <div className="bg-white border rounded-2xl shadow-sm p-6 mb-8">
          <TodaysSchedule
            t={text}
            lang={lang}
            todaysAppointments={todaysAppointments}
            isBarberBusiness={false}
            barberMap={{}}
            providerMap={providerMap}
          />
        </div>

        {/* ALL MY APPOINTMENTS */}
        <section className="bg-white border rounded-2xl shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold mb-1">
            {lang === "es"
              ? "Todas mis Citas"
              : "All My Appointments"}
          </h2>

          <p className="text-sm text-gray-500 mb-5">
            {lang === "es"
              ? "Consulta y administra tu historial de citas."
              : "View and manage your appointment history."}
          </p>

          <AllAppointments
            t={text}
            lang={lang}
            isBarberBusiness={false}
            filterBarberId={filterBarberId}
            setFilterBarberId={setFilterBarberId}
            filterDate={filterDate}
            setFilterDate={setFilterDate}
            filterMonth={filterMonth}
            setFilterMonth={setFilterMonth}
            appointments={appointments}
            barberMap={{}}
            providerMap={providerMap}
            groupedByBarber={groupedByBarber}
            pageByBarber={pageByBarber}
            openBarbers={openBarbers}
            APPOINTMENTS_PER_PAGE={APPOINTMENTS_PER_PAGE}
            toggleBarberOpen={toggleBarberOpen}
            changeBarberPage={changeBarberPage}
            professionalMode={true}
          />
        </section>

        {/* MY SCHEDULE */}
        <section className="bg-white border rounded-2xl shadow-sm p-6 mb-8">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">
              🕐{" "}
              {lang === "es"
                ? "Mi Horario"
                : "My Schedule"}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {lang === "es"
                ? "Administra los días y horas en los que estás disponible para recibir citas."
                : "Manage the days and times when you are available for appointments."}
            </p>
          </div>

          <div className="space-y-3">
            {providerAvailability.map((day) => (
              <div
                key={day.day_of_week}
                className="border rounded-xl p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <p className="font-semibold text-lg">
                    {getDayName(day.day_of_week)}
                  </p>

                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={Boolean(day.is_available)}
                      onChange={(e) =>
                        updateAvailabilityDay(
                          day.day_of_week,
                          "is_available",
                          e.target.checked
                        )
                      }
                    />

                    <span
                      className={
                        day.is_available
                          ? "text-green-600"
                          : "text-red-500"
                      }
                    >
                      {day.is_available
                        ? lang === "es"
                          ? "Disponible"
                          : "Available"
                        : lang === "es"
                        ? "No disponible"
                        : "Unavailable"}
                    </span>
                  </label>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {lang === "es"
                        ? "Hora de inicio"
                        : "Start time"}
                    </label>

                    <input
                      type="time"
                      value={day.start_time?.slice(0, 5) || ""}
                      disabled={!day.is_available}
                      onChange={(e) =>
                        updateAvailabilityDay(
                          day.day_of_week,
                          "start_time",
                          e.target.value
                        )
                      }
                      className="border rounded-lg p-2 w-full disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      {lang === "es"
                        ? "Hora de cierre"
                        : "End time"}
                    </label>

                    <input
                      type="time"
                      value={day.end_time?.slice(0, 5) || ""}
                      disabled={!day.is_available}
                      onChange={(e) =>
                        updateAvailabilityDay(
                          day.day_of_week,
                          "end_time",
                          e.target.value
                        )
                      }
                      className="border rounded-lg p-2 w-full disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {availabilityMessage && (
            <p
              className={`mt-4 text-sm font-medium ${
                availabilityMessage.includes("correctamente") ||
                availabilityMessage.includes("successfully")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {availabilityMessage}
            </p>
          )}

          <button
            type="button"
            onClick={saveProviderAvailability}
            disabled={savingProviderAvailability}
            className="mt-5 bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {savingProviderAvailability
              ? lang === "es"
                ? "Guardando..."
                : "Saving..."
              : lang === "es"
              ? "Guardar horario"
              : "Save Schedule"}
          </button>
        </section>

        {/* BLOCK MY TIME */}
<section className="bg-white border rounded-2xl shadow-sm p-6">
  <div className="mb-4">
    <h2 className="text-2xl font-bold">
      🚫{" "}
      {lang === "es"
        ? "Bloquear Horario"
        : "Block Time"}
    </h2>

    <p className="text-sm text-gray-500 mt-1">
      {lang === "es"
        ? "Bloquea días u horas en los que no estarás disponible para recibir citas."
        : "Block days or times when you will not be available for appointments."}
    </p>
  </div>

  <ProviderBlockingPanel
    providerId={provider.id}
    lang={lang}
  />
</section>      
</div>
    </main>
  );
}