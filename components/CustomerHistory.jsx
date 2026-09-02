"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

const CUSTOMER_PAGE_SIZE = 10;
const HISTORY_PAGE_SIZE = 10;

export default function CustomerHistory({
  barberId,
  lang = "es",
  refreshTrigger = 0,
}) {

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState("recent");
  const [customerPage, setCustomerPage] = useState(1);
  const [historyVisible, setHistoryVisible] = useState(
    HISTORY_PAGE_SIZE
  );

  async function loadCustomers() {
    if (!barberId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_email,
        service,
        date,
        time,
        status,
        price,
        notes
      `)
      .eq("barber_id", barberId)
      .order("date", { ascending: false })
      .order("time", { ascending: false });

    if (error) {
      console.error("Customer history error:", error);
      setCustomers([]);
      setLoading(false);
      return;
    }

    const grouped = {};

    (data || []).forEach((appointment) => {
      const customerName =
        (appointment.customer_name || "Cliente").trim();

      const normalizedName = customerName.toLowerCase();

      const phoneDigits = normalizePhone(
        appointment.customer_phone
      );

      const email = normalizeEmail(
        appointment.customer_email
      );

      /*
       * Identity priority:
       * 1. Phone number
       * 2. Valid email
       * 3. Name fallback
       *
       * Phone is deliberately first because Dominican customers
       * may enter different emails, no email, or invalid text.
       */
      let customerKey = "";

      if (phoneDigits) {
        customerKey = `phone:${phoneDigits}`;
      } else if (email) {
        customerKey = `email:${email}`;
      } else {
        customerKey = `name:${normalizedName}`;
      }

      if (!grouped[customerKey]) {
        grouped[customerKey] = {
          key: customerKey,
          name: customerName,
          phone: appointment.customer_phone || "",
          email: email || "",
          appointments: [],
        };
      }

      grouped[customerKey].appointments.push(appointment);

      /*
       * Keep the best available contact information.
       */
      if (
        !grouped[customerKey].phone &&
        appointment.customer_phone
      ) {
        grouped[customerKey].phone =
          appointment.customer_phone;
      }

      if (
        !grouped[customerKey].email &&
        email
      ) {
        grouped[customerKey].email = email;
      }

      /*
       * Prefer a nicer customer name if the first record was generic.
       */
      if (
        grouped[customerKey].name === "Cliente" &&
        customerName !== "Cliente"
      ) {
        grouped[customerKey].name = customerName;
      }
    });

    const customerList = Object.values(grouped).map(
      (customer) => {
        const allAppointments = customer.appointments;

        const validAppointments = allAppointments.filter(
          (appointment) =>
            appointment.status !== "cancelled" &&
            appointment.status !== "canceled"
        );

        const serviceCounts = {};

        validAppointments.forEach((appointment) => {
          if (!appointment.service) return;

          serviceCounts[appointment.service] =
            (serviceCounts[appointment.service] || 0) + 1;
        });

        let favoriteService = "";

        const serviceEntries = Object.entries(
          serviceCounts
        ).sort((a, b) => b[1] - a[1]);

        if (serviceEntries.length > 0) {
          favoriteService = serviceEntries[0][0];
        }

        const sortedAppointments = [
          ...allAppointments,
        ].sort(compareAppointmentsDesc);

        const validSortedAppointments = [
          ...validAppointments,
        ].sort(compareAppointmentsDesc);

        const lastVisit =
          validSortedAppointments[0] || null;

        const completedCount = allAppointments.filter(
          (appointment) =>
            appointment.status === "completed"
        ).length;

        const cancelledCount = allAppointments.filter(
          (appointment) =>
            appointment.status === "cancelled" ||
            appointment.status === "canceled"
        ).length;

        const noShowCount = allAppointments.filter(
          (appointment) =>
            appointment.status === "no_show"
        ).length;

        return {
          ...customer,
          appointments: sortedAppointments,
          totalVisits: validAppointments.length,
          completedCount,
          cancelledCount,
          noShowCount,
          lastVisit,
          favoriteService,
        };
      }
    );

    setCustomers(customerList);
setCustomerPage(1);

/*
 * Refresh the currently opened customer too.
 */
setSelectedCustomer((currentCustomer) => {
  if (!currentCustomer) {
    return null;
  }

  const updatedCustomer = customerList.find(
    (customer) =>
      customer.key === currentCustomer.key
  );

  return updatedCustomer || null;
});
 setLoading(false);
  }

  useEffect(() => {
  loadCustomers();
}, [barberId, refreshTrigger]);

  /*
   * Search.
   */
  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase();

    let result = [...customers];

    if (value) {
      result = result.filter((customer) => {
        return (
          customer.name.toLowerCase().includes(value) ||
          customer.phone.toLowerCase().includes(value) ||
          customer.email.toLowerCase().includes(value)
        );
      });
    }

    /*
     * Sort.
     */
    if (sortMode === "az") {
      result.sort((a, b) =>
        a.name.localeCompare(
          b.name,
          lang === "es" ? "es" : "en",
          { sensitivity: "base" }
        )
      );
    } else {
      result.sort((a, b) => {
        const dateA = a.lastVisit
          ? getAppointmentDate(a.lastVisit)
          : 0;

        const dateB = b.lastVisit
          ? getAppointmentDate(b.lastVisit)
          : 0;

        return dateB - dateA;
      });
    }

    return result;
  }, [customers, search, sortMode, lang]);

  const totalCustomerPages = Math.max(
    1,
    Math.ceil(
      filteredCustomers.length / CUSTOMER_PAGE_SIZE
    )
  );

  const safeCustomerPage = Math.min(
    customerPage,
    totalCustomerPages
  );

  const visibleCustomers = filteredCustomers.slice(
    (safeCustomerPage - 1) *
      CUSTOMER_PAGE_SIZE,
    safeCustomerPage * CUSTOMER_PAGE_SIZE
  );

  /*
   * When a customer is opened, reset history pagination.
   */
  function openCustomer(customer) {
    setSelectedCustomer(customer);
    setHistoryVisible(HISTORY_PAGE_SIZE);
  }

  function closeCustomer() {
    setSelectedCustomer(null);
    setHistoryVisible(HISTORY_PAGE_SIZE);
  }

  function formatTime(time) {
    if (!time) return "";

    const [hour, minute] = time.split(":");
    const date = new Date();

    date.setHours(
      parseInt(hour, 10),
      parseInt(minute, 10),
      0,
      0
    );

    return date.toLocaleTimeString(
      lang === "es" ? "es-ES" : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  }

  function formatDate(dateValue) {
    if (!dateValue) return "";

    const date = new Date(
      `${dateValue}T00:00:00`
    );

    return date.toLocaleDateString(
      lang === "es" ? "es-ES" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  }

  function translateService(service) {
    return (
      serviceNames[service]?.[lang] ||
      service ||
      (lang === "es" ? "Servicio" : "Service")
    );
  }

  function getStatusLabel(status) {
    if (status === "confirmed") {
      return lang === "es"
        ? "Confirmada"
        : "Confirmed";
    }

    if (
      status === "cancelled" ||
      status === "canceled"
    ) {
      return lang === "es"
        ? "Cancelada"
        : "Cancelled";
    }

    if (status === "completed") {
      return lang === "es"
        ? "Completada"
        : "Completed";
    }

    if (status === "no_show") {
      return lang === "es"
        ? "No asistió"
        : "No-show";
    }

    if (status === "rescheduled") {
      return lang === "es"
        ? "Reprogramada"
        : "Rescheduled";
    }

    return status || "—";
  }

  function getStatusClass(status) {
    if (status === "confirmed") {
      return "bg-green-100 text-green-700";
    }

    if (
      status === "cancelled" ||
      status === "canceled"
    ) {
      return "bg-red-100 text-red-700";
    }

    if (status === "completed") {
      return "bg-blue-100 text-blue-700";
    }

    if (status === "no_show") {
      return "bg-orange-100 text-orange-700";
    }

    if (status === "rescheduled") {
      return "bg-purple-100 text-purple-700";
    }

    return "bg-gray-100 text-gray-700";
  }

  function getWhatsAppLink(phone) {
    const digits = normalizePhone(phone);

    if (!digits) return null;

    return `https://wa.me/${digits}`;
  }

  function getCallLink(phone) {
    if (!phone) return null;

    return `tel:${phone}`;
  }

  function getMailLink(email) {
    if (!email) return null;

    return `mailto:${email}`;
  }

  function isValidEmail(email) {
    if (!email) return false;

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email.trim()
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 mb-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {lang === "es"
                ? "Clientes"
                : "Customers"}
            </h3>

            <p className="text-sm text-gray-500">
              {filteredCustomers.length}{" "}
              {lang === "es"
                ? filteredCustomers.length === 1
                  ? "cliente"
                  : "clientes"
                : filteredCustomers.length === 1
                ? "customer"
                : "customers"}
            </p>
          </div>

          <button
            onClick={loadCustomers}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm"
          >
            {lang === "es"
              ? "Actualizar"
              : "Refresh"}
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setCustomerPage(1);
          }}
          placeholder={
            lang === "es"
              ? "Buscar por nombre, teléfono o correo..."
              : "Search by name, phone, or email..."
          }
          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Sort */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">
            {lang === "es"
              ? "Ordenar:"
              : "Sort:"}
          </span>

          <button
            onClick={() => {
              setSortMode("recent");
              setCustomerPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs ${
              sortMode === "recent"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {lang === "es"
              ? "Más recientes"
              : "Most recent"}
          </button>

          <button
            onClick={() => {
              setSortMode("az");
              setCustomerPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs ${
              sortMode === "az"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            A–Z
          </button>
        </div>
      </div>

      {/* Customer list */}
      {loading ? (
        <p className="text-sm text-gray-500">
          {lang === "es"
            ? "Cargando clientes..."
            : "Loading customers..."}
        </p>
      ) : visibleCustomers.length === 0 ? (
        <p className="text-sm text-gray-500">
          {search
            ? lang === "es"
              ? "No se encontraron clientes."
              : "No customers found."
            : lang === "es"
            ? "Todavía no hay historial de clientes."
            : "No customer history yet."}
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {visibleCustomers.map((customer) => (
              <div
                key={customer.key}
                className="border border-gray-200 rounded-xl p-4"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {customer.name}
                    </h4>

                    <div className="mt-1 space-y-1">
                      {customer.phone && (
                        <p className="text-sm text-gray-600">
                          📞 {customer.phone}
                        </p>
                      )}

                      {isValidEmail(customer.email) && (
                        <p className="text-sm text-gray-600 truncate">
                          ✉️ {customer.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                      {customer.totalVisits}{" "}
                      {lang === "es"
                        ? customer.totalVisits === 1
                          ? "visita"
                          : "visitas"
                        : customer.totalVisits === 1
                        ? "visit"
                        : "visits"}
                    </span>

                    {customer.favoriteService && (
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                        {lang === "es"
                          ? "Favorito:"
                          : "Favorite:"}{" "}
                        {translateService(
                          customer.favoriteService
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {customer.lastVisit && (
                  <p className="text-xs text-gray-500 mt-3">
                    {lang === "es"
                      ? "Última visita:"
                      : "Last visit:"}{" "}
                    {formatDate(
                      customer.lastVisit.date
                    )}{" "}
                    ·{" "}
                    {formatTime(
                      customer.lastVisit.time
                    )}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {customer.phone && (
                    <>
                      {getCallLink(
                        customer.phone
                      ) && (
                        <a
                          href={getCallLink(
                            customer.phone
                          )}
                          className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-xs"
                        >
                          📞{" "}
                          {lang === "es"
                            ? "Llamar"
                            : "Call"}
                        </a>
                      )}

                      {getWhatsAppLink(
                        customer.phone
                      ) && (
                        <a
                          href={getWhatsAppLink(
                            customer.phone
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs"
                        >
                          💬 WhatsApp
                        </a>
                      )}
                    </>
                  )}

                  {isValidEmail(
                    customer.email
                  ) && (
                    <a
                      href={getMailLink(
                        customer.email
                      )}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs"
                    >
                      ✉️ Email
                    </a>
                  )}

                  <button
                    onClick={() =>
                      openCustomer(customer)
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                  >
                    {lang === "es"
                      ? "Ver historial"
                      : "View history"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Customer pagination */}
          {totalCustomerPages > 1 && (
            <div className="flex items-center justify-between gap-3 mt-5 border-t pt-4">
              <button
                disabled={safeCustomerPage <= 1}
                onClick={() =>
                  setCustomerPage(
                    Math.max(
                      1,
                      safeCustomerPage - 1
                    )
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm ${
                  safeCustomerPage <= 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                ←{" "}
                {lang === "es"
                  ? "Anterior"
                  : "Previous"}
              </button>

              <span className="text-xs text-gray-500">
                {safeCustomerPage} /{" "}
                {totalCustomerPages}
              </span>

              <button
                disabled={
                  safeCustomerPage >=
                  totalCustomerPages
                }
                onClick={() =>
                  setCustomerPage(
                    Math.min(
                      totalCustomerPages,
                      safeCustomerPage + 1
                    )
                  )
                }
                className={`px-3 py-2 rounded-lg text-sm ${
                  safeCustomerPage >=
                  totalCustomerPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {lang === "es"
                  ? "Siguiente"
                  : "Next"}{" "}
                →
              </button>
            </div>
          )}
        </>
      )}

      {/* Selected customer */}
      {selectedCustomer && (
        <div className="mt-6 border-2 border-blue-100 rounded-2xl p-5 bg-gray-50">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <h4 className="text-xl font-bold text-gray-900 truncate">
                {selectedCustomer.name}
              </h4>

              {selectedCustomer.phone && (
                <p className="text-sm text-gray-600 mt-1">
                  📞 {selectedCustomer.phone}
                </p>
              )}

              {isValidEmail(
                selectedCustomer.email
              ) && (
                <p className="text-sm text-gray-600 mt-1 break-all">
                  ✉️{" "}
                  {selectedCustomer.email}
                </p>
              )}
            </div>

            <button
              onClick={closeCustomer}
              className="px-3 py-1 bg-gray-200 rounded-lg text-sm"
            >
              ✕
            </button>
          </div>

          {/* Quick contact */}
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedCustomer.phone && (
              <>
                <a
                  href={getCallLink(
                    selectedCustomer.phone
                  )}
                  className="px-3 py-2 bg-white border rounded-lg text-xs"
                >
                  📞{" "}
                  {lang === "es"
                    ? "Llamar"
                    : "Call"}
                </a>

                {getWhatsAppLink(
                  selectedCustomer.phone
                ) && (
                  <a
                    href={getWhatsAppLink(
                      selectedCustomer.phone
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs"
                  >
                    💬 WhatsApp
                  </a>
                )}
              </>
            )}

            {isValidEmail(
              selectedCustomer.email
            ) && (
              <a
                href={getMailLink(
                  selectedCustomer.email
                )}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs"
              >
                ✉️ Email
              </a>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <div className="bg-white rounded-xl p-3 border">
              <p className="text-xs text-gray-500">
                {lang === "es"
                  ? "Visitas"
                  : "Visits"}
              </p>

              <p className="text-xl font-bold mt-1">
                {selectedCustomer.totalVisits}
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 border">
              <p className="text-xs text-gray-500">
                {lang === "es"
                  ? "Completadas"
                  : "Completed"}
              </p>

              <p className="text-xl font-bold mt-1">
                {selectedCustomer.completedCount}
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 border">
              <p className="text-xs text-gray-500">
                {lang === "es"
                  ? "Canceladas"
                  : "Cancelled"}
              </p>

              <p className="text-xl font-bold mt-1">
                {selectedCustomer.cancelledCount}
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 border">
              <p className="text-xs text-gray-500">
                {lang === "es"
                  ? "No asistió"
                  : "No-shows"}
              </p>

              <p className="text-xl font-bold mt-1">
                {selectedCustomer.noShowCount}
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 border">
              <p className="text-xs text-gray-500">
                {lang === "es"
                  ? "Servicio favorito"
                  : "Favorite service"}
              </p>

              <p className="text-sm font-semibold mt-1">
                {selectedCustomer.favoriteService
                  ? translateService(
                      selectedCustomer.favoriteService
                    )
                  : "—"}
              </p>
            </div>
          </div>

          {/* Last visit */}
          <div className="bg-white rounded-xl p-4 border mb-5">
            <p className="text-xs text-gray-500">
              {lang === "es"
                ? "Última visita"
                : "Last visit"}
            </p>

            <p className="font-semibold mt-1">
              {selectedCustomer.lastVisit
                ? `${formatDate(
                    selectedCustomer.lastVisit
                      .date
                  )} · ${formatTime(
                    selectedCustomer.lastVisit
                      .time
                  )}`
                : "—"}
            </p>
          </div>

          {/* Appointment history */}
          <h5 className="font-semibold text-gray-900 mb-3">
            {lang === "es"
              ? "Historial de citas"
              : "Appointment history"}
          </h5>

          {selectedCustomer.appointments.length === 0 ? (
            <p className="text-sm text-gray-500">
              {lang === "es"
                ? "No hay citas."
                : "No appointments."}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {selectedCustomer.appointments
                  .slice(0, historyVisible)
                  .map((appointment) => (
                    <div
                      key={appointment.id}
                      className="bg-white border rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {translateService(
                            appointment.service
                          )}
                        </p>

                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(
                            appointment.date
                          )}{" "}
                          ·{" "}
                          {formatTime(
                            appointment.time
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {appointment.price != null &&
                          appointment.price !== "" && (
                            <span className="text-sm font-medium">
                              ${appointment.price}
                            </span>
                          )}

                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getStatusClass(
                            appointment.status
                          )}`}
                        >
                          {getStatusLabel(
                            appointment.status
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              {historyVisible <
                selectedCustomer.appointments
                  .length && (
                <button
                  onClick={() =>
                    setHistoryVisible(
                      (current) =>
                        current +
                        HISTORY_PAGE_SIZE
                    )
                  }
                  className="mt-4 w-full md:w-auto px-4 py-2 bg-black text-white rounded-lg text-sm"
                >
                  {lang === "es"
                    ? "Cargar más"
                    : "Load more"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================
   HELPERS
========================= */

function normalizePhone(phone) {
  if (!phone) return "";

  const digits = String(phone).replace(
    /\D/g,
    ""
  );

  /*
   * Dominican Republic numbers normally end up
   * as a 10-digit number.
   *
   * If a number comes in with country code 1,
   * remove the leading 1 for matching.
   */
  if (
    digits.length === 11 &&
    digits.startsWith("1")
  ) {
    return digits.slice(1);
  }

  return digits;
}

function normalizeEmail(email) {
  if (!email) return "";

  const value = String(email)
    .trim()
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "";
  }

  return value;
}

function getAppointmentDate(appointment) {
  if (!appointment?.date) return 0;

  const value = new Date(
    `${appointment.date}T${
      appointment.time || "00:00"
    }`
  );

  return value.getTime();
}

function compareAppointmentsDesc(a, b) {
  return (
    getAppointmentDate(b) -
    getAppointmentDate(a)
  );
}