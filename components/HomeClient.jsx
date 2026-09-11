"use client";

import { useState } from "react";
import Link from "next/link";

export default function HomeClient() {
  const [lang, setLang] = useState("es");

  const t = {
    es: {
      brand: "FLOWPAYDR BOOKING",

      title: "Reservas fáciles para",
      title2: "clientes y negocios.",

      subtitle:
        "Reserva una cita online o administra las citas, clientes, servicios y profesionales de tu negocio desde un solo lugar.",

      book: "Reservar una Cita",
      dashboard: "Entrar al Panel",

      customerTitle: "¿Buscas reservar una cita?",
      customerText:
        "Encuentra un negocio o profesional, selecciona tu servicio, fecha y horario disponible.",
      customerButton: "Buscar dónde reservar",

      businessTitle: "¿Tienes un negocio?",
      businessText:
        "Organiza tus citas, clientes, servicios, horarios y profesionales con FlowPayDR Booking.",

      barberRegister: "Registrar Barbería / Barbero",
      businessRegister: "Registrar Otro Negocio",
      businessButton: "Entrar al Panel",

      whyTitle: "Todo lo que necesitas para tus citas",

      feature1Title: "Reservas 24/7",
      feature1Text:
        "Tus clientes pueden reservar en cualquier momento desde su teléfono.",

      feature2Title: "Confirmaciones y recordatorios",
      feature2Text:
        "Los clientes reciben confirmaciones y recordatorios de sus citas por email.",

      feature3Title: "Clientes e historial",
      feature3Text:
        "Mantén organizada la información y el historial de citas de tus clientes.",

      feature4Title: "Negocios y profesionales",
      feature4Text:
        "Funciona para negocios con equipos y también para profesionales independientes.",

      feature5Title: "Servicios y horarios",
      feature5Text:
        "Configura tus servicios, duración, disponibilidad y días de trabajo.",

      feature6Title: "Google Maps y Waze",
      feature6Text:
        "Ayuda a tus clientes a encontrar fácilmente la ubicación de tu negocio.",

      categoriesTitle: "Hecho para negocios y profesionales",

      categories1:
        "Barberías • Barberos • Uñas • Salones",

      categories2:
        "Spas • Veterinarios • Car Wash • Y más",

      finalTitle:
        "Reserva cuando quieras. Administra desde un solo lugar.",

      footer: "FlowPayDR — Booking Platform",
    },

    en: {
      brand: "FLOWPAYDR BOOKING",

      title: "Easy booking for",
      title2: "customers and businesses.",

      subtitle:
        "Book an appointment online or manage your business appointments, customers, services and professionals from one place.",

      book: "Book an Appointment",
      dashboard: "Login to Dashboard",

      customerTitle: "Looking to book an appointment?",
      customerText:
        "Find a business or professional, choose your service, date and available time.",
      customerButton: "Find a place to book",

      businessTitle: "Do you own a business?",
      businessText:
        "Manage your appointments, customers, services, schedules and professionals with FlowPayDR Booking.",

      barberRegister: "Register Barbershop / Barber",
      businessRegister: "Register Other Business",
      businessButton: "Login to Dashboard",

      whyTitle: "Everything you need for appointments",

      feature1Title: "24/7 Booking",
      feature1Text:
        "Customers can book appointments anytime directly from their phone.",

      feature2Title: "Confirmations & Reminders",
      feature2Text:
        "Customers receive appointment confirmations and reminders by email.",

      feature3Title: "Customers & History",
      feature3Text:
        "Keep your customer information and appointment history organized.",

      feature4Title: "Businesses & Professionals",
      feature4Text:
        "Built for businesses with teams and independent professionals.",

      feature5Title: "Services & Schedules",
      feature5Text:
        "Configure services, duration, availability and working days.",

      feature6Title: "Google Maps & Waze",
      feature6Text:
        "Help customers easily find the location of your business.",

      categoriesTitle: "Built for businesses and professionals",

      categories1:
        "Barbershops • Barbers • Nails • Salons",

      categories2:
        "Spas • Veterinarians • Car Wash • And more",

      finalTitle:
        "Book anytime. Manage everything from one place.",

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

          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
            {tr.subtitle}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-10">

            <Link
              href="/select-business"
              className="bg-black text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg hover:bg-gray-800 transition"
            >
              {tr.book}
            </Link>

            <Link
              href="/login"
              className="bg-gray-100 text-gray-900 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-200 transition"
            >
              {tr.dashboard}
            </Link>

          </div>
        </div>
      </section>

      {/* CUSTOMER / BUSINESS */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-5xl mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* CUSTOMER */}
            <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">

              <div className="text-4xl mb-5">📅</div>

              <h2 className="text-2xl font-black mb-3">
                {tr.customerTitle}
              </h2>

              <p className="text-gray-500 leading-relaxed mb-6">
                {tr.customerText}
              </p>

              <Link
                href="/select-business"
                className="inline-block bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition"
              >
                {tr.customerButton}
              </Link>

            </div>

            {/* BUSINESS */}
            <div className="bg-black text-white rounded-2xl p-8 shadow-sm">

              <div className="text-4xl mb-5">💼</div>

              <h2 className="text-2xl font-black mb-3">
                {tr.businessTitle}
              </h2>

              <p className="text-gray-300 leading-relaxed mb-6">
                {tr.businessText}
              </p>

              <div className="flex flex-col gap-3">

                <Link
                  href={`/register-barber?lang=${lang}`}
                  className="inline-block bg-white text-black px-6 py-3 rounded-xl font-bold text-center hover:bg-gray-100 transition"
                >
                  {tr.barberRegister}
                </Link>

                <Link
                  href="/business/register"
                  className="inline-block bg-white text-black px-6 py-3 rounded-xl font-bold text-center hover:bg-gray-100 transition"
                >
                  {tr.businessRegister}
                </Link>

                <Link
                  href="/login"
                  className="inline-block border border-gray-600 text-white px-6 py-3 rounded-xl font-bold text-center hover:bg-gray-900 transition"
                >
                  {tr.businessButton}
                </Link>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">

          <h2 className="text-3xl sm:text-4xl font-black text-center mb-12">
            {tr.whyTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            <Feature
              icon="📅"
              title={tr.feature1Title}
              text={tr.feature1Text}
            />

            <Feature
              icon="✉️"
              title={tr.feature2Title}
              text={tr.feature2Text}
            />

            <Feature
              icon="👥"
              title={tr.feature3Title}
              text={tr.feature3Text}
            />

            <Feature
              icon="💈"
              title={tr.feature4Title}
              text={tr.feature4Text}
            />

            <Feature
              icon="🕐"
              title={tr.feature5Title}
              text={tr.feature5Text}
            />

            <Feature
              icon="📍"
              title={tr.feature6Title}
              text={tr.feature6Text}
            />

          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="bg-gray-50 px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">

          <h2 className="text-2xl sm:text-3xl font-black mb-6">
            {tr.categoriesTitle}
          </h2>

          <p className="text-lg sm:text-xl font-semibold text-gray-700">
            {tr.categories1}
          </p>

          <p className="text-lg sm:text-xl font-semibold text-gray-400 mt-2">
            {tr.categories2}
          </p>

        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">

          <h2 className="text-3xl sm:text-4xl font-black">
            {tr.finalTitle}
          </h2>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">

            <Link
              href="/select-business"
              className="bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 transition"
            >
              {tr.book}
            </Link>

            <Link
              href="/login"
              className="border border-gray-200 px-8 py-4 rounded-xl font-bold hover:bg-gray-50 transition"
            >
              {tr.dashboard}
            </Link>

          </div>
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

function Feature({ icon, title, text }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">

      <div className="text-3xl mb-4">
        {icon}
      </div>

      <h3 className="text-xl font-bold mb-2">
        {title}
      </h3>

      <p className="text-gray-500 leading-relaxed">
        {text}
      </p>

    </div>
  );
}