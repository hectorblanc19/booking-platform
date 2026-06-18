"use client";

import { useState } from "react";

export default function Home() {
  const [lang, setLang] = useState("es");

  const t = {
    es: {
      title: "Bienvenido a FlowPayDR Booking",
      subtitle: "Selecciona un negocio para comenzar a reservar tu cita.",
      button: "Reservar una Cita",
      langLabel: "Idioma",
      es: "ES",
      en: "EN",
    },
    en: {
      title: "Welcome to FlowPayDR Booking",
      subtitle: "Select a business to begin booking your appointment.",
      button: "Book an Appointment",
      langLabel: "Language",
      es: "ES",
      en: "EN",
    },
  };

  const tr = t[lang];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black p-10">

      {/* Language Toggle */}
      <div className="absolute top-6 right-6 flex gap-2 items-center">
        <span className="text-sm text-black dark:text-white">{tr.langLabel}:</span>

        <button
          className={`px-2 py-1 text-sm rounded ${
            lang === "es" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("es")}
        >
          {tr.es}
        </button>

        <button
          className={`px-2 py-1 text-sm rounded ${
            lang === "en" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("en")}
        >
          {tr.en}
        </button>
      </div>

      <h1 className="text-3xl font-bold text-black dark:text-white mb-6">
        {tr.title}
      </h1>

      <p className="text-lg text-zinc-600 dark:text-zinc-300 mb-8 text-center">
        {tr.subtitle}
      </p>

      <a
        href="/booking/test"
        className="px-6 py-3 bg-black text-white rounded-lg hover:bg-zinc-800 transition"
      >
        {tr.button}
      </a>
    </div>
  );
}
