"use client";

import { useState } from "react";
import Link from "next/link";

export default function WelcomePage() {
  const [lang, setLang] = useState("es");

  const t = {
    es: {
      title: "Bienvenido a FlowPayDR Booking",
      subtitle: "Selecciona un negocio para comenzar a reservar tu cita.",
      start: "Reservar una Cita",
      login: "Entrar al Panel",
      whyTitle: "¿Por qué usar FlowPayDR?",
      p1: "Perfecto para barberos, salones, uñas, spas, car wash y más.",
      p2: "Hecho para negocios en República Dominicana y USA.",
      p3: "Evita doble reservas automáticamente.",
      p4: "Confirmaciones por email para clientes y barberos.",
      p5: "Página de reservas moderna y fácil de usar.",
      footer: "FlowPayDR — Plataforma de Reservas",
    },
    en: {
      title: "Welcome to FlowPayDR Booking",
      subtitle: "Select a business to start booking your appointment.",
      start: "Book an Appointment",
      login: "Login to Dashboard",
      whyTitle: "Why use FlowPayDR?",
      p1: "Perfect for barbers, salons, nails, spas, car wash and more.",
      p2: "Built for businesses in Dominican Republic and USA.",
      p3: "Automatic double‑booking prevention.",
      p4: "Email confirmations for customers and barbers.",
      p5: "Modern and easy‑to‑use booking page.",
      footer: "FlowPayDR — Booking Platform",
    },
  };

  const tr = t[lang];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Language Toggle */}
      <div className="flex justify-end p-4 gap-2">
        <button
          className={`px-3 py-1 rounded ${lang === "es" ? "bg-black text-white" : "bg-gray-200"}`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
        <button
          className={`px-3 py-1 rounded ${lang === "en" ? "bg-black text-white" : "bg-gray-200"}`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center text-center px-6 mt-10">
        <h1 className="text-4xl font-bold mb-3">{tr.title}</h1>
        <p className="text-lg text-gray-600 max-w-xl">{tr.subtitle}</p>

        <div className="flex gap-4 mt-8">
          <Link href="/select-business">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg">
              {tr.start}
            </button>
          </Link>

          <Link href="/admin">
            <button className="bg-gray-200 px-6 py-3 rounded-xl text-lg">
              {tr.login}
            </button>
          </Link>
        </div>
      </div>

      {/* Why Section */}
      <div className="mt-16 px-6 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">{tr.whyTitle}</h2>

        <div className="grid gap-4">
          <div className="p-4 bg-white rounded-xl shadow">{tr.p1}</div>
          <div className="p-4 bg-white rounded-xl shadow">{tr.p2}</div>
          <div className="p-4 bg-white rounded-xl shadow">{tr.p3}</div>
          <div className="p-4 bg-white rounded-xl shadow">{tr.p4}</div>
          <div className="p-4 bg-white rounded-xl shadow">{tr.p5}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto text-center py-6 text-gray-500">
        {tr.footer}
      </div>
    </div>
  );
}
