"use client";

import { useEffect, useState } from "react";

const PAGE_SIZE = 10;

function customerKey(customer) {
  return String(
    customer.phone || customer.email || customer.name || ""
  ).toLowerCase();
}

function formatDate(date, time, lang) {
  if (!date) return "-";

  const value = new Date(
    `${String(date).slice(0, 10)}T${String(time || "00:00").slice(0, 5)}:00`
  );

  if (Number.isNaN(value.getTime())) {
    return `${date} ${time || ""}`;
  }

  return new Intl.DateTimeFormat(
    lang === "es" ? "es-DO" : "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(value);
}

function appointmentStatus(status, lang) {
  const key = String(status || "").toLowerCase();

  const statuses = {
    completed: {
      es: "Completada",
      en: "Completed",
      color: "bg-green-100 text-green-800",
    },
    confirmed: {
      es: "Confirmada",
      en: "Confirmed",
      color: "bg-blue-100 text-blue-800",
    },
    cancelled: {
      es: "Cancelada",
      en: "Cancelled",
      color: "bg-red-100 text-red-800",
    },
    canceled: {
      es: "Cancelada",
      en: "Cancelled",
      color: "bg-red-100 text-red-800",
    },
    no_show: {
      es: "No asistió",
      en: "No-show",
      color: "bg-amber-100 text-amber-800",
    },
  };

  return (
    statuses[key] || {
      es: status || "-",
      en: status || "-",
      color: "bg-gray-100 text-gray-700",
    }
  );
}

export default function CustomerList({ t, lang, customers = [] }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKey, setSelectedKey] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);

  const filtered = customers.filter((customer) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    const name = String(customer.name || "").toLowerCase();
    const email = String(customer.email || "").toLowerCase();
    const phone = String(customer.phone || "").toLowerCase();

    const queryDigits = query.replace(/\D/g, "");
    const phoneDigits = phone.replace(/\D/g, "");

    return (
      name.includes(query) ||
      email.includes(query) ||
      phone.includes(query) ||
      (queryDigits.length > 0 && phoneDigits.includes(queryDigits))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(startIndex, startIndex + PAGE_SIZE);

  const selected = customers.find(
    (customer) => customerKey(customer) === selectedKey
  );

  const history = selected
    ? [...(selected.history || [])].sort((a, b) =>
        `${b.date || ""}T${b.time || ""}`.localeCompare(
          `${a.date || ""}T${a.time || ""}`
        )
      )
    : [];

  const historyTotalPages = Math.max(
    1,
    Math.ceil(history.length / PAGE_SIZE)
  );

  const visibleHistory = history.slice(
    (historyPage - 1) * PAGE_SIZE,
    historyPage * PAGE_SIZE
  );

  const countStatus = (status) =>
    history.filter(
      (appointment) =>
        String(appointment.status || "").toLowerCase() === status
    ).length;

  const completed = countStatus("completed");
  const cancelled =
    countStatus("cancelled") + countStatus("canceled");
  const noShows = countStatus("no_show");

  const es = lang === "es";

  const labels = {
    search: es
      ? "Buscar por nombre, teléfono o correo..."
      : "Search by name, phone or email...",
    select: es
      ? "Selecciona un cliente para ver su historial."
      : "Select a customer to view appointment history.",
    history: es ? "Historial de citas" : "Appointment history",
    appointments: es ? "Citas totales" : "Total appointments",
    completed: es ? "Completadas" : "Completed",
    cancelled: es ? "Canceladas" : "Cancelled",
    noShows: es ? "No asistió" : "No-show",
    empty: es ? "No hay clientes todavía." : "No customers yet.",
    noResults: es ? "No se encontraron clientes." : "No customers found.",
    noHistory: es ? "No hay citas." : "No appointments.",
    page: es ? "Página" : "Page",
    of: es ? "de" : "of",
    previous: es ? "Anterior" : "Previous",
    next: es ? "Siguiente" : "Next",
    last: es ? "Última cita" : "Last appointment",
    close: es ? "Cerrar historial" : "Close history",
  };

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-4">
        {t[lang].customerList}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        <div className="lg:col-span-2 bg-white border rounded-xl shadow-sm p-4">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCurrentPage(1);
            }}
            placeholder={labels.search}
            className="w-full border rounded-lg px-3 py-2 mb-4"
          />

          {customers.length === 0 && (
            <p className="text-gray-500 text-sm">{labels.empty}</p>
          )}

          {customers.length > 0 && filtered.length === 0 && (
            <p className="text-gray-500 text-sm">{labels.noResults}</p>
          )}

          <div className="space-y-2">
            {visible.map((customer, index) => {
              const key = customerKey(customer);
              const active = key === selectedKey;

              return (
                <button
                  type="button"
                  key={`${key}-${startIndex + index}`}
                  onClick={() =>
                    {
                      setSelectedKey(active ? null : key);
                      setHistoryPage(1);
                    }
                  }
                  className={`w-full text-left border rounded-xl p-3 transition ${
                    active
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold shrink-0">
                      {String(customer.name || "?").charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {customer.name || "-"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {customer.count} {t[lang].appointments}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {customer.phone || customer.email || ""}
                      </p>
                    </div>

                    <span className="text-blue-600 text-lg">
                      {active ? "-" : ">"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                disabled={currentPage === 1}
                className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40"
              >
                {labels.previous}
              </button>

              <span className="text-xs text-gray-600">
                {labels.page} {currentPage} {labels.of} {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40"
              >
                {labels.next}
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white border rounded-xl shadow-sm p-5">
          {!selected ? (
            <div className="text-center py-14 text-gray-500">
              <div className="text-4xl mb-3">{"\uD83D\uDC64"}</div>
              <p>{labels.select}</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b pb-4 mb-4">
                <div className="min-w-0">
                  <h3 className="text-xl font-bold break-words">
                    {selected.name}
                  </h3>

                  {selected.email && (
                    <p className="text-sm text-gray-600 break-all">
                      {selected.email}
                    </p>
                  )}

                  {selected.phone && (() => {
                    const digits = String(selected.phone).replace(/\D/g, "");

                    return digits ? (
                      <a
                        href={`https://wa.me/${digits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-700 underline"
                      >
                        {selected.phone}
                      </a>
                    ) : (
                      <p className="text-sm">{selected.phone}</p>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="text-sm border rounded-lg px-3 py-2 shrink-0"
                >
                  {labels.close}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {[
                  [labels.appointments, history.length, "text-blue-700"],
                  [labels.completed, completed, "text-green-700"],
                  [labels.cancelled, cancelled, "text-red-700"],
                  [labels.noShows, noShows, "text-amber-700"],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="border rounded-xl p-3 bg-gray-50"
                  >
                    <p className={`text-2xl font-bold ${color}`}>
                      {value}
                    </p>
                    <p className="text-xs text-gray-600">{label}</p>
                  </div>
                ))}
              </div>

              <h4 className="font-semibold text-lg mb-3">
                {labels.history}
              </h4>

              {history.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {labels.noHistory}
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleHistory.map((appointment, index) => {
                    const status = appointmentStatus(
                      appointment.status,
                      lang
                    );

                    return (
                      <div
                        key={appointment.id || index}
                        className="border rounded-xl p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold break-words">
                              {appointment.service ||
                                (es ? "Servicio" : "Service")}
                            </p>

                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(
                                appointment.date,
                                appointment.time,
                                lang
                              )}
                            </p>
                          </div>

                          <span
                            className={`text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${status.color}`}
                          >
                            {status[es ? "es" : "en"]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() =>
                      setHistoryPage((page) => Math.max(1, page - 1))
                    }
                    disabled={historyPage === 1}
                    className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40"
                  >
                    {labels.previous}
                  </button>

                  <span className="text-xs text-gray-600">
                    {labels.page} {historyPage} {labels.of} {historyTotalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setHistoryPage((page) =>
                        Math.min(historyTotalPages, page + 1)
                      )
                    }
                    disabled={historyPage === historyTotalPages}
                    className="px-3 py-2 border rounded-lg text-sm disabled:opacity-40"
                  >
                    {labels.next}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
