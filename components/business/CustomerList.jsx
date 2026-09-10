"use client";

export default function CustomerList({
  t,
  lang,
  customers,
}) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-3">
        {t[lang].customerList}
      </h2>

      <div className="border rounded-xl p-4 bg-white shadow">
        {customers.map((c, i) => (
          <div key={i} className="border-b py-3 last:border-none">
            <p>
              <strong>{c.name}</strong>
            </p>

            <p>
              {c.email} — {c.phone}
            </p>

            <p>
              {c.count} {t[lang].appointments} — {t[lang].last}: {c.last}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}