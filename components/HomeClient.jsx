
"use client";

import { useState } from "react";
import Link from "next/link";

export default function HomeClient() {
  const [lang, setLang] = useState("es");

  const t = {
    es: {
      brand: "FLOWPAYDR BOOKING",
      title: "Reserva tu cita fácil,",
      title2: "rápido y profesional.",
      subtitle:
        "Encuentra tu barbería o barbero favorito, selecciona tu servicio y reserva tu horario.",
      book: "Reservar una Cita",
      dashboard: "Entrar al Panel",
      whyTitle: "¿Por qué usar FlowPayDR?",
      feature1Title: "Reservas 24/7",
      feature1Text: "Reserva cuando quieras.",
      feature2Title: "Confirmaciones por email",
      feature2Text:
        "Recibe tu confirmación y recordatorios de tu cita.",
      feature3Title: "Google Maps y Waze",
      feature3Text:
        "Encuentra fácilmente dónde está tu barbería.",
      feature4Title: "Barberías y barberos",
      feature4Text:
        "Reserva con negocios o profesionales independientes.",
      categories1: "Barberías • Barberos • Uñas",
      categories2: "Salones • Spas • Car Wash",
      footer: "FlowPayDR — Booking Platform",
    },

    en: {
      brand: "FLOWPAYDR BOOKING",
      title: "Book your appointment",
      title2: "easy, fast and professional.",
      subtitle:
        "Find your favorite barbershop or barber, select your service and book your time.",
      book: "Book an Appointment",
      dashboard: "Login to Dashboard",
      whyTitle: "Why use FlowPayDR?",
      feature1Title: "24/7 Booking",
      feature1Text: "Book whenever you want.",
      feature2Title: "Email Confirmations",
      feature2Text:
        "Receive your confirmation and appointment reminders by email.",
      feature3Title: "Google Maps & Waze",
      feature3Text:
        "Easily find the location of your barbershop.",
      feature4Title: "Barbershops & Barbers",
      feature4Text:
        "Book with businesses or independent professionals.",
      categories1: "Barbershops • Barbers • Nails",
      categories2: "Salons • Spas • Car Wash",
      footer: "FlowPayDR — Booking Platform",
    },
  };

  const tr = t[lang];

  return (
    <main className="min-h-screen bg-white text-gray-900 flex flex-col">

      {/* HEADER */}
      <header className="w-full px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">

          <div className="font-black tracking-tight text-lg">
            FLOWPAYDR
            <span className="text-gray-500 font-semibold">
              {" "}BOOKING
            </span>
          </div>

          {/* LANGUAGE TOGGLE */}
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

      {/* HERO */}
      <section className="px-6 pt-16 pb-20">
        <div className="max-w-4xl mx-auto text-center">

          <p className="text-sm sm:text-base font-bold tracking-[0.25em] text-gray-500 mb-5">
            {tr.brand}
          </p>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            {tr.title}
            <br />
            {tr.title2}
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {tr.subtitle}
          </p>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">

            <Link
              href="/select-business"
              className="bg-black text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg hover:bg-gray-800 transition"
            >
              {tr.book}
            </Link>

            <Link
              href="/barber/login"
              className="bg-gray-100 text-gray-900 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-200 transition"
            >
              {tr.dashboard}
            </Link>

          </div>
        </div>
      </section>

      {/* WHY FLOWPAYDR */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-5xl mx-auto">

          <h2 className="text-3xl sm:text-4xl font-black text-center mb-10">
            {tr.whyTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* FEATURE 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl mb-4">📅</div>

              <h3 className="text-xl font-bold mb-2">
                {tr.feature1Title}
              </h3>

              <p className="text-gray-500 leading-relaxed">
                {tr.feature1Text}
              </p>
            </div>

            {/* FEATURE 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl mb-4">✉️</div>

              <h3 className="text-xl font-bold mb-2">
                {tr.feature2Title}
              </h3>

              <p className="text-gray-500 leading-relaxed">
                {tr.feature2Text}
              </p>
            </div>

            {/* FEATURE 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl mb-4">📍</div>

              <h3 className="text-xl font-bold mb-2">
                {tr.feature3Title}
              </h3>

              <p className="text-gray-500 leading-relaxed">
                {tr.feature3Text}
              </p>
            </div>

            {/* FEATURE 4 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl mb-4">💈</div>

              <h3 className="text-xl font-bold mb-2">
                {tr.feature4Title}
              </h3>

              <p className="text-gray-500 leading-relaxed">
                {tr.feature4Text}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-6 py-14 text-center">
        <div className="max-w-4xl mx-auto">

          <p className="text-lg sm:text-xl font-semibold text-gray-700">
            {tr.categories1}
          </p>

          <p className="text-lg sm:text-xl font-semibold text-gray-400 mt-2">
            {tr.categories2}
          </p>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-gray-100 px-6 py-8 text-center">
        <p className="text-sm text-gray-400">
          {tr.footer}
        </p>
      </footer>

    </main>
  );
}

