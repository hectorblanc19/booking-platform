"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginSelectorPage() {
  const [lang, setLang] = useState("es");

  const t = {
    es: {
      title: "Entrar al Panel",
      subtitle: "Selecciona el tipo de panel al que deseas entrar.",
      barber: "Panel de Barbero",
      barberText:
        "Para barberos que administran sus citas y clientes.",
      business: "Panel de Negocio",
      businessText:
        "Para dueños de negocios que administran su equipo, servicios y citas.",
      enter: "Entrar →",
      back: "← Volver al Inicio",
    },

    en: {
      title: "Login to Dashboard",
      subtitle: "Select the type of dashboard you want to access.",
      barber: "Barber Dashboard",
      barberText:
        "For barbers managing their appointments and customers.",
      business: "Business Dashboard",
      businessText:
        "For business owners managing their team, services and appointments.",
      enter: "Login →",
      back: "← Back Home",
    },
  };

  const tr = t[lang];

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="font-black tracking-tight text-lg">
            FLOWPAYDR
            <span className="text-gray-500 font-semibold">
              {" "}BOOKING
            </span>
          </Link>

          <div className="flex items-center gap-1 border border-gray-200 rounded-full p-1 bg-gray-50">
            <button
              type="button"
              onClick={() => setLang("es")}
              className={
                "px-3 py-1.5 rounded-full text-sm font-semibold transition " +
                (lang === "es"
                  ? "bg-black text-white"
                  : "text-gray-500 hover:text-black")
              }
            >
              ES
            </button>

            <button
              type="button"
              onClick={() => setLang("en")}
              className={
                "px-3 py-1.5 rounded-full text-sm font-semibold transition " +
                (lang === "en"
                  ? "bg-black text-white"
                  : "text-gray-500 hover:text-black")
              }
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-bold tracking-[0.25em] text-gray-400 mb-4">
              FLOWPAYDR BOOKING
            </p>

            <h1 className="text-3xl sm:text-4xl font-black">
              {tr.title}
            </h1>

            <p className="mt-4 text-gray-500 text-lg">
              {tr.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* BARBER */}
            <Link href="/barber/login" className="block">
              <div className="h-full bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
                <div className="text-3xl mb-4">💈</div>

                <h2 className="text-xl font-black mb-2">
                  {tr.barber}
                </h2>

                <p className="text-gray-500 leading-relaxed mb-6">
                  {tr.barberText}
                </p>

                <p className="font-bold">
                  {tr.enter}
                </p>
              </div>
            </Link>

            {/* BUSINESS */}
            <Link href="/business/login" className="block">
              <div className="h-full bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-lg transition">
                <div className="text-3xl mb-4">🏢</div>

                <h2 className="text-xl font-black mb-2">
                  {tr.business}
                </h2>

                <p className="text-gray-500 leading-relaxed mb-6">
                  {tr.businessText}
                </p>

                <p className="font-bold">
                  {tr.enter}
                </p>
              </div>
            </Link>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-black"
            >
              {tr.back}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}