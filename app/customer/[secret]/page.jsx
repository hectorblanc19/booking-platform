"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ServiceWorkerClient from "@/app/ServiceWorkerClient";

// Service translation dictionary
const serviceNames = {
  Haircut: { es: "Corte", en: "Haircut" },
  Beard: { es: "Barba", en: "Beard" },
  "Haircut + Beard": {
    es: "Corte + Barba",
    en: "Haircut + Beard",
  },
  Fade: { es: "Fade", en: "Fade" },
  Other: { es: "Otro", en: "Other" },
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

    // TOUR
    guests: "Guests",
    pickup: "Meeting / Pickup Location",
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

    // TOUR
    guests: "Personas",
    pickup: "Punto de encuentro o recogida",
  },
};

function formatTime12(time) {
  if (!time) return "";

  const [hourString, minute] = time.split(":");

  let hour = Number(hourString);

  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${period}`;
}

export default function CustomerSecretPage() {
  const { secret } = useParams();
  const router = useRouter();

  const [lang, setLang] = useState("es");

  const [appointment, setAppointment] =
    useState(null);

  const [barber, setBarber] =
    useState(null);

  const [provider, setProvider] =
    useState(null);

  const [business, setBusiness] =
    useState(null);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const urlLang =
      params.get("lang");

    if (
      urlLang === "es" ||
      urlLang === "en"
    ) {
      setLang(urlLang);
    }
  }, []);

  const tr = t[lang];

  useEffect(() => {
    loadAppointment();
  }, []);

  useEffect(() => {
    if (
      !appointment ||
      appointment === "not-found"
    ) {
      return;
    }

    const channel = supabase
      .channel(
        `appointment-${appointment.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter:
            `id=eq.${appointment.id}`,
        },
        (payload) => {
          console.log(
            "Realtime update:",
            payload
          );

          loadAppointment();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointment?.id]);

  async function loadAppointment() {
    // FIRST TRY THE APPOINTMENT ID
    let {
      data: appt,
    } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", secret)
      .maybeSingle();

    // FALLBACK FOR EXISTING BARBER / OLD SECRET LINKS
    if (!appt) {
      const {
        data: apptBySecret,
      } = await supabase
        .from("appointments")
        .select("*")
        .eq(
          "secret_link",
          secret
        )
        .maybeSingle();

      appt = apptBySecret;
    }

    if (!appt) {
      setAppointment(
        "not-found"
      );

      return;
    }

    // Keep customer page in the language
    // saved with the appointment
    if (
      appt.lang === "es" ||
      appt.lang === "en"
    ) {
      setLang(appt.lang);
    }

    setAppointment(appt);

    // LOAD BARBER OR GENERIC PROVIDER
    if (appt.provider_id) {
      const {
        data: providerData,
      } = await supabase
        .from("providers")
        .select("*")
        .eq(
          "id",
          appt.provider_id
        )
        .maybeSingle();

      setProvider(
        providerData || null
      );

      setBarber(null);
    } else if (appt.barber_id) {
      const {
        data: barberData,
      } = await supabase
        .from("barbers")
        .select("*")
        .eq(
          "id",
          appt.barber_id
        )
        .maybeSingle();

      setBarber(
        barberData || null
      );

      setProvider(null);
    }

    // LOAD BUSINESS
    if (appt.business_id) {
      const {
        data: businessData,
      } = await supabase
        .from("businesses")
        .select("*")
        .eq(
          "id",
          appt.business_id
        )
        .maybeSingle();

      setBusiness(
        businessData || null
      );
    } else {
      setBusiness(null);
    }
  }

  async function cancelAppointment() {
    const now = new Date();

    const apptDateTime =
      new Date(
        `${appointment.date}T${appointment.time}`
      );

    if (apptDateTime < now) {
      alert(
        lang === "es"
          ? "La cita ya pasó. No se puede cancelar."
          : "This appointment has already passed. Cannot cancel."
      );

      return;
    }

    // ⭐ UPDATE APPOINTMENT STATUS
    const {
      error: cancelError,
    } = await supabase
      .from("appointments")
      .update({
        status: "cancelled",
      })
      .eq(
        "id",
        appointment.id
      );

    if (cancelError) {
      console.error(
        "Appointment cancellation error:",
        cancelError
      );

      alert(
        lang === "es"
          ? "Error cancelando la cita."
          : "Error cancelling appointment."
      );

      return;
    }

    // ⭐ GENERIC PROVIDER CANCELLATION EMAIL
    if (
      appointment.provider_id
    ) {
      try {
        const {
          data: providerData,
        } = await supabase
          .from("providers")
          .select(
            "name, email"
          )
          .eq(
            "id",
            appointment.provider_id
          )
          .maybeSingle();

        if (
          providerData?.email
        ) {
          const response =
            await fetch(
              "/api/send-barber-notification",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    provider_email:
                      providerData.email,

                    provider_name:
                      providerData.name,

                    provider_id:
                      appointment.provider_id,

                    customer_name:
                      appointment.customer_name,

                    customer_phone:
                      appointment.customer_phone,

                    customer_email:
                      appointment.customer_email ||
                      null,

                    service:
                      appointment.service,

                    date:
                      appointment.date,

                    time:
                      appointment.time,

                    notes:
                      appointment.notes ||
                      null,

                    // TOUR DETAILS
                    guest_count:
                      appointment.is_group_booking
                        ? appointment.guest_count
                        : null,

                    pickup_location:
                      appointment.is_group_booking
                        ? appointment.pickup_location
                        : null,

                    is_group_booking:
                      Boolean(
                        appointment.is_group_booking
                      ),

                    // Provider must NOT receive
                    // owner dashboard access
                    dashboard_link:
                      null,

                    lang:
                      appointment.lang ||
                      lang,

                    notification_type:
                      "cancelled",
                  }),
              }
            );

          const data =
            await response.json();

          if (!data.success) {
            console.error(
              "Provider cancellation email error:",
              data
            );
          }
        }
      } catch (error) {
        console.error(
          "Provider cancellation email request failed:",
          error
        );
      }
    }

    // ⭐ KEEP EXISTING BARBER PUSH NOTIFICATION
    if (
      appointment.barber_id
    ) {
      const notificationLang =
        appointment.lang ||
        lang;

      fetch(
        "/api/push/send",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              role: "business",

              barber_id:
                appointment.barber_id,

              title:
                notificationLang ===
                "es"
                  ? "Cita Cancelada"
                  : "Appointment Cancelled",

              message:
                notificationLang ===
                "es"
                  ? `El cliente canceló su cita para el ${appointment.date} a las ${formatTime12(
                      appointment.time
                    )}.`
                  : `Client cancelled their appointment for ${appointment.date} at ${formatTime12(
                      appointment.time
                    )}.`,
            }),
        }
      ).catch(() => {});
    }

    alert(
      lang === "es"
        ? "Cita cancelada"
        : "Appointment cancelled"
    );

    loadAppointment();
  }

  function shareWhatsApp() {
    const professionalLabel =
      provider
        ? lang === "es"
          ? "Profesional"
          : "Professional"
        : tr.barber;

    const professionalName =
      provider?.name ||
      barber?.name ||
      "";

    const serviceLabel =
      lang === "es"
        ? "Servicio"
        : "Service";

    const isTourBooking =
      Boolean(
        appointment.is_group_booking
      );

    const tourDetails =
      isTourBooking
        ? `${
            lang === "es"
              ? "Personas"
              : "Guests"
          }: ${
            appointment.guest_count ||
            "N/A"
          }\n${
            lang === "es"
              ? "Punto de encuentro o recogida"
              : "Meeting / Pickup Location"
          }: ${
            appointment.pickup_location ||
            "N/A"
          }\n`
        : "";

    const message =
      `${
        lang === "es"
          ? "¡Mi cita está confirmada!"
          : "My appointment is confirmed!"
      }\n\n` +

      `${serviceLabel}: ${
        serviceNames[
          appointment.service
        ]?.[lang] ||
        appointment.service
      }\n` +

      `${professionalLabel}: ${professionalName}\n` +

      `${tr.business}: ${
        business?.name || ""
      }\n` +

      `${tr.date}: ${
        appointment.date
      }\n` +

      `${tr.time}: ${formatTime12(
        appointment.time
      )}\n` +

      tourDetails +

      `\n${
        lang === "es"
          ? "Ver detalles:"
          : "View details:"
      } ` +

      `${window.location.href}`;

    const url =
      `https://wa.me/?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      url,
      "_blank"
    );
  }

  if (
    appointment ===
    "not-found"
  ) {
    return (
      <p className="p-6 text-red-600 text-center text-lg">
        {lang === "es"
          ? "Cita no encontrada."
          : "Appointment not found."}
      </p>
    );
  }

  if (!appointment) {
    return (
      <p className="p-6">
        Loading...
      </p>
    );
  }

  const now = new Date();

  const apptDateTime =
    new Date(
      `${appointment.date}T${appointment.time}`
    );

  const isPast =
    apptDateTime < now;

  const isTourBooking =
    Boolean(
      appointment.is_group_booking
    );

  return (
    <div className="max-w-xl mx-auto p-6">

      {/* CUSTOMER PUSH SUBSCRIPTION */}
      <ServiceWorkerClient
        role="customer"
        secret_link={secret}
      />

      {/* LANGUAGE TOGGLE */}
      <div className="flex justify-end gap-2 mb-4">

        <span className="text-sm">
          {tr.lang}:
        </span>

        <button
          className={`px-2 py-1 rounded ${
            lang === "es"
              ? "bg-black text-white"
              : "bg-gray-200"
          }`}
          onClick={() =>
            setLang("es")
          }
        >
          ES
        </button>

        <button
          className={`px-2 py-1 rounded ${
            lang === "en"
              ? "bg-black text-white"
              : "bg-gray-200"
          }`}
          onClick={() =>
            setLang("en")
          }
        >
          EN
        </button>

      </div>

      <h1 className="text-2xl font-bold mb-4">
        {tr.title}
      </h1>

      {/* STATUS MESSAGE */}
      <div className="text-center mb-6">

        {appointment.status ===
        "confirmed" ? (
          <>
            <div className="text-green-600 text-5xl mb-2">
              ✔
            </div>

            <h2 className="text-2xl font-bold">
              {lang === "es"
                ? "¡Cita Confirmada!"
                : "Appointment Confirmed!"}
            </h2>
          </>
        ) : appointment.status ===
          "completed" ? (
          <>
            <div className="text-blue-600 text-5xl mb-2">
              ✔
            </div>

            <h2 className="text-2xl font-bold">
              {lang === "es"
                ? "¡Cita Completada!"
                : "Appointment Completed!"}
            </h2>

            <p className="text-gray-600 mt-2">
              {lang === "es"
                ? "Gracias por visitarnos."
                : "Thank you for visiting us."}
            </p>
          </>
        ) : appointment.status ===
          "no_show" ? (
          <>
            <div className="text-orange-500 text-5xl mb-2">
              ⚠
            </div>

            <h2 className="text-2xl font-bold">
              {lang === "es"
                ? "Cita marcada como no asistida"
                : "Appointment marked as no-show"}
            </h2>
          </>
        ) : (
          <>
            <div className="text-red-600 text-5xl mb-2">
              ✖
            </div>

            <h2 className="text-2xl font-bold">
              {lang === "es"
                ? "Cita Cancelada"
                : "Appointment Cancelled"}
            </h2>
          </>
        )}

        <button
          className="mt-4 bg-black text-white px-5 py-3 rounded-xl w-full"
          onClick={() => {
            if (
              appointment.provider_id &&
              appointment.business_id
            ) {
              window.location.href =
                `/business/${appointment.business_id}/booking`;
            } else {
              window.location.href =
                "/";
            }
          }}
        >
          {lang === "es"
            ? "Volver al Inicio"
            : "Back Home"}
        </button>

        {appointment.status ===
          "confirmed" && (
          <button
            className="mt-3 bg-green-600 text-white px-5 py-3 rounded-xl w-full"
            onClick={
              shareWhatsApp
            }
          >
            {lang === "es"
              ? "Compartir por WhatsApp"
              : "Share via WhatsApp"}
          </button>
        )}

      </div>

      {/* APPOINTMENT CARD */}
      <div className="p-5 border rounded-xl bg-white shadow-md">

        <p className="text-lg font-semibold mb-2">
          {serviceNames[
            appointment.service
          ]?.[lang] ||
            appointment.service}
        </p>

        <p className="text-sm">
          <strong>
            {provider
              ? lang === "es"
                ? "Profesional"
                : "Professional"
              : tr.barber}
            :
          </strong>{" "}

          {provider?.name ||
            barber?.name}
        </p>

        <p className="text-sm">
          <strong>
            {tr.business}:
          </strong>{" "}

          {business?.name}
        </p>

        <p className="text-sm mt-2">
          <strong>
            {tr.date}:
          </strong>{" "}

          {appointment.date}
        </p>

        <p className="text-sm">
          <strong>
            {tr.time}:
          </strong>{" "}

          {formatTime12(
            appointment.time
          )}
        </p>

        {/* ⭐ TOUR DETAILS ONLY */}
        {isTourBooking && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">

            <p className="text-sm">
              <strong>
                {tr.guests}:
              </strong>{" "}

              {appointment.guest_count ??
                "N/A"}
            </p>

            <p className="text-sm mt-1">
              <strong>
                {tr.pickup}:
              </strong>{" "}

              {appointment.pickup_location ||
                "N/A"}
            </p>

          </div>
        )}

        <p className="text-sm mt-2">
          <strong>
            {lang === "es"
              ? "Precio"
              : "Price"}
            :
          </strong>{" "}

          {appointment.price !==
            null &&
          appointment.price !==
            undefined
            ? `RD$${Number(
                appointment.price
              ).toLocaleString(
                "en-US",
                {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                }
              )}`
            : lang === "es"
            ? "No disponible"
            : "Not available"}
        </p>

        <p className="text-sm mt-2">
          <strong>
            {tr.name}:
          </strong>{" "}

          {appointment.customer_name}
        </p>

        <p className="text-sm">
          <strong>
            {tr.phone}:
          </strong>{" "}

          {appointment.customer_phone}
        </p>

        <p className="text-sm">
          <strong>
            {tr.email}:
          </strong>{" "}

          {appointment.customer_email}
        </p>

        {/* STATUS */}
        <div className="flex items-center gap-2 mt-3">

          {appointment.status ===
          "confirmed" ? (
            <>
              <span className="text-green-600 text-lg">
                ✔
              </span>

              <span className="font-semibold text-green-700 text-sm">
                {lang === "es"
                  ? "Confirmado"
                  : "Confirmed"}
              </span>
            </>
          ) : appointment.status ===
            "completed" ? (
            <>
              <span className="text-blue-600 text-lg">
                ✔
              </span>

              <span className="font-semibold text-blue-700 text-sm">
                {lang === "es"
                  ? "Completada"
                  : "Completed"}
              </span>
            </>
          ) : appointment.status ===
            "no_show" ? (
            <>
              <span className="text-orange-500 text-lg">
                ⚠
              </span>

              <span className="font-semibold text-orange-600 text-sm">
                {lang === "es"
                  ? "No asistió"
                  : "No-show"}
              </span>
            </>
          ) : (
            <>
              <span className="text-red-600 text-lg">
                ✖
              </span>

              <span className="font-semibold text-red-700 text-sm">
                {lang === "es"
                  ? "Cancelado"
                  : "Cancelled"}
              </span>
            </>
          )}

        </div>

        <p className="text-sm mt-3">
          <strong>
            {tr.notes}:
          </strong>{" "}

          {appointment.notes ||
            tr.none}
        </p>

      </div>

      {/* BUTTONS */}
      {appointment.status ===
        "confirmed" &&
        !isPast && (
          <>
            <button
              className="mt-4 w-full bg-red-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              onClick={
                cancelAppointment
              }
            >
              ❌ {tr.cancel}
            </button>

            <button
              className="mt-3 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              onClick={() =>
                router.push(
                  `/customer/reschedule?secret=${secret}`
                )
              }
            >
              🔄 {tr.reschedule}
            </button>
          </>
        )}

      {isPast && (
        <p className="mt-4 text-center text-red-600 font-semibold">
          {lang === "es"
            ? "Esta cita ya pasó. No se puede cancelar ni reprogramar."
            : "This appointment has already passed. You cannot cancel or reschedule."}
        </p>
      )}

    </div>
  );
}