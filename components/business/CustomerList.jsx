"use client";

import { useEffect, useState } from "react";

export default function CustomerList({
  t,
  lang,
  customers,
}) {
  const ITEMS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(
    1,
    Math.ceil(customers.length / ITEMS_PER_PAGE)
  );

  // If the customer list changes and the current page
  // no longer exists, return to the last valid page.
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [customers.length, currentPage, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const visibleCustomers = customers.slice(
    startIndex,
    endIndex
  );

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-3">
        {t[lang].customerList}
      </h2>

      <div className="border rounded-xl p-4 bg-white shadow">
        {customers.length === 0 ? (
          <p className="text-gray-500">
            {lang === "es"
              ? "No hay clientes todavía."
              : "No customers yet."}
          </p>
        ) : (
          <>
            {visibleCustomers.map((c, i) => (
              <div
                key={`${c.phone || c.email || c.name}-${startIndex + i}`}
                className="border-b py-3 last:border-none"
              >
                <p>
                  <strong>{c.name}</strong>
                </p>

                <p>
                  {c.email} — {c.phone}
                </p>

                <p>
                  {c.count} {t[lang].appointments} —{" "}
                  {t[lang].last}: {c.last}
                </p>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(1, page - 1)
                    )
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {lang === "es"
                    ? "← Anterior"
                    : "← Previous"}
                </button>

                <span className="text-sm text-gray-600">
                  {lang === "es" ? "Página" : "Page"}{" "}
                  <strong>{currentPage}</strong>{" "}
                  {lang === "es" ? "de" : "of"}{" "}
                  <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(totalPages, page + 1)
                    )
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {lang === "es"
                    ? "Siguiente →"
                    : "Next →"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}