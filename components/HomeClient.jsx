"use client";

import { useState } from "react";
import Link from "next/link";

export default function HomeClient() {
  const [lang, setLang] = useState("es");

  const t = {
    es: {
      brand: "FLOWPAYDR BOOKING",

      badge: "Reservas online para negocios y profesionales",
      title: "Tu agenda trabajando,",
      title2: "incluso cuando tú no estás.",
      subtitle:
        "Tus clientes reservan online. Tú administras citas, clientes, servicios, horarios y tu equipo desde un solo lugar.",

      book: "Reservar una Cita",
      businessDashboard: "Panel de Negocio",
      barberDashboard: "Panel de Barbero",

      productEyebrow: "TU NEGOCIO, ORGANIZADO",
      productTitle: "Todo tu negocio,",
      productTitle2: "en un solo lugar.",
      productText:
        "Una agenda clara para saber qué sigue, quién atiende y cómo va tu día sin depender de mensajes y libretas.",

      today: "Citas de hoy",
      calendar: "Calendario",
      customers: "Clientes",
      appointments: "Citas",
      completed: "Completada",
      confirmed: "Confirmada",
      noShow: "No Show",

      qrTitle: "QR para Reservar",
      qrText:
        "Comparte tu QR y permite que tus clientes reserven fácilmente.",

      teamTitle: "Tu equipo",
      teamText:
        "Administra barberos y profesionales desde tu panel.",

      customerTitle: "¿Buscas reservar una cita?",
      customerText:
        "Encuentra un negocio o profesional, selecciona tu servicio, fecha y horario disponible.",
      customerButton: "Buscar dónde reservar",

      businessTitle: "¿Tienes un negocio?",
      businessText:
        "Comienza a organizar tus citas, clientes, servicios, horarios y profesionales con FlowPayDR Booking.",

      businessRegister: "Registrar Negocio",
      businessRegisterSub: "Barbería, salón, uñas, spa y más",
      barberRegister: "Soy Barbero",
      barberRegisterSub: "Crear mi perfil profesional",

      whyEyebrow: "HERRAMIENTAS PARA TU DÍA A DÍA",
      whyTitle: "Menos tiempo organizando.",
      whyTitle2: "Más tiempo atendiendo.",

      feature1Title: "Reservas 24/7",
      feature1Text:
        "Tus clientes pueden reservar desde su teléfono cuando les resulte conveniente.",

      feature2Title: "Confirmaciones y recordatorios",
      feature2Text:
        "Mantén a tus clientes informados sobre sus próximas citas.",

      feature3Title: "Clientes e historial",
      feature3Text:
        "Consulta la información y el historial de citas de tus clientes.",

      feature4Title: "Tu equipo",
      feature4Text:
        "Administra los profesionales de tu negocio y sus citas desde un mismo lugar.",

      feature5Title: "Servicios y horarios",
      feature5Text:
        "Configura servicios, disponibilidad, días de trabajo y horarios.",

      feature6Title: "Ubicación",
      feature6Text:
        "Ayuda a tus clientes a encontrar tu negocio con Google Maps y Waze.",

      categoriesEyebrow: "HECHO PARA DIFERENTES NEGOCIOS",
      categoriesTitle: "¿Cuál es tu negocio?",
      categoriesText:
        "FlowPayDR se adapta a negocios y profesionales que trabajan con reservas.",

      catBarbershop: "Barberías",
      catBarber: "Barberos",
      catNails: "Uñas",
      catSalon: "Salones",
      catSpa: "Spas",
      catVet: "Veterinarios",
      catClinic: "Clínicas",
      catCarWash: "Car Wash",

      howEyebrow: "EMPIEZA FÁCIL",
      howTitle: "De tu negocio a recibir reservas.",
      howText:
        "Configura tu cuenta, comparte tu enlace y deja que tus clientes reserven.",

      step1: "Registra tu negocio",
      step1Text:
        "Crea tu cuenta y agrega la información principal de tu negocio.",

      step2: "Configura tus servicios",
      step2Text:
        "Agrega tus servicios, horarios y los profesionales de tu equipo.",

      step3: "Comparte tu enlace o QR",
      step3Text:
        "Tus clientes pueden entrar directamente a tu página de reservas.",

      step4: "Recibe tus reservas",
      step4Text:
        "Las nuevas citas quedan organizadas en tu panel.",

      finalEyebrow: "FLOWPAYDR BOOKING",
      finalTitle: "Tu negocio sigue recibiendo",
      finalTitle2: "reservas mientras tú trabajas.",
      finalText:
        "Dale a tus clientes una forma sencilla de reservar y mantén tu agenda organizada.",

      footerText: "Reservas fáciles para clientes y negocios.",
      footerMarketplace: "Reservar",
      footerRegister: "Registrar Negocio",
    },

    en: {
      brand: "FLOWPAYDR BOOKING",

      badge: "Online booking for businesses and professionals",
      title: "Your schedule keeps working,",
      title2: "even when you're busy.",
      subtitle:
        "Customers book online. You manage appointments, customers, services, schedules and your team from one place.",

      book: "Book an Appointment",
      businessDashboard: "Business Dashboard",
      barberDashboard: "Barber Dashboard",

      productEyebrow: "YOUR BUSINESS, ORGANIZED",
      productTitle: "Your whole business,",
      productTitle2: "in one place.",
      productText:
        "A clear schedule to see what's next, who's working and how your day is going without depending on messages and notebooks.",

      today: "Today's Appointments",
      calendar: "Calendar",
      customers: "Customers",
      appointments: "Appointments",
      completed: "Completed",
      confirmed: "Confirmed",
      noShow: "No Show",

      qrTitle: "Booking QR",
      qrText:
        "Share your QR so customers can easily book with your business.",

      teamTitle: "Your Team",
      teamText:
        "Manage barbers and professionals directly from your dashboard.",

      customerTitle: "Looking to book an appointment?",
      customerText:
        "Find a business or professional, select your service, date and available time.",
      customerButton: "Find a place to book",

      businessTitle: "Do you own a business?",
      businessText:
        "Start organizing appointments, customers, services, schedules and professionals with FlowPayDR Booking.",

      businessRegister: "Register Business",
      businessRegisterSub: "Barbershop, salon, nails, spa & more",
      barberRegister: "I'm a Barber",
      barberRegisterSub: "Create my professional profile",

      whyEyebrow: "TOOLS FOR YOUR DAY",
      whyTitle: "Less time organizing.",
      whyTitle2: "More time serving customers.",

      feature1Title: "24/7 Booking",
      feature1Text:
        "Customers can book from their phone whenever it's convenient for them.",

      feature2Title: "Confirmations & Reminders",
      feature2Text:
        "Keep customers informed about their upcoming appointments.",

      feature3Title: "Customers & History",
      feature3Text:
        "View customer information and appointment history in one place.",

      feature4Title: "Your Team",
      feature4Text:
        "Manage your professionals and their appointments from the same dashboard.",

      feature5Title: "Services & Schedules",
      feature5Text:
        "Configure services, availability, working days and schedules.",

      feature6Title: "Location",
      feature6Text:
        "Help customers find your business with Google Maps and Waze.",

      categoriesEyebrow: "BUILT FOR DIFFERENT BUSINESSES",
      categoriesTitle: "What kind of business are you?",
      categoriesText:
        "FlowPayDR adapts to businesses and professionals that work with appointments.",

      catBarbershop: "Barbershops",
      catBarber: "Barbers",
      catNails: "Nails",
      catSalon: "Salons",
      catSpa: "Spas",
      catVet: "Veterinarians",
      catClinic: "Clinics",
      catCarWash: "Car Wash",

      howEyebrow: "GET STARTED EASILY",
      howTitle: "From your business to receiving bookings.",
      howText:
        "Set up your account, share your link and let customers book.",

      step1: "Register your business",
      step1Text:
        "Create your account and add the main information about your business.",

      step2: "Set up your services",
      step2Text:
        "Add services, schedules and the professionals on your team.",

      step3: "Share your link or QR",
      step3Text:
        "Customers can go directly to your online booking page.",

      step4: "Receive bookings",
      step4Text:
        "New appointments stay organized inside your dashboard.",

      finalEyebrow: "FLOWPAYDR BOOKING",
      finalTitle: "Your business keeps receiving",
      finalTitle2: "bookings while you work.",
      finalText:
        "Give customers an easy way to book and keep your schedule organized.",

      footerText: "Easy booking for customers and businesses.",
      footerMarketplace: "Book",
      footerRegister: "Register Business",
    },
  };

  const tr = t[lang];

  const categories = [
    { icon: "💈", label: tr.catBarbershop },
    { icon: "✂️", label: tr.catBarber },
    { icon: "💅", label: tr.catNails },
    { icon: "✨", label: tr.catSalon },
    { icon: "🧖", label: tr.catSpa },
    { icon: "🐾", label: tr.catVet },
    { icon: "🩺", label: tr.catClinic },
    { icon: "🚗", label: tr.catCarWash },
  ];

  return (
    <main className="min-h-screen bg-white text-gray-950">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black">
              F
            </div>

            <div className="font-black tracking-tight text-lg">
              FLOWPAYDR
              <span className="text-gray-400 font-semibold">
                {" "}BOOKING
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/select-business"
              className="hidden lg:block text-sm font-bold text-gray-600 hover:text-black"
            >
              {tr.book}
            </Link>

            <Link
              href="/business/login"
              className="hidden md:block text-sm font-bold text-gray-600 hover:text-black"
            >
              {tr.businessDashboard}
            </Link>

            <Link
              href="/barber/login"
              className="hidden md:block text-sm font-bold text-gray-600 hover:text-black"
            >
              {tr.barberDashboard}
            </Link>

            <div className="flex items-center gap-1 border border-gray-200 rounded-full p-1 bg-gray-50">
              <button
                type="button"
                onClick={() => setLang("es")}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-bold transition " +
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
                  "px-3 py-1.5 rounded-full text-xs font-bold transition " +
                  (lang === "en"
                    ? "bg-black text-white"
                    : "text-gray-500 hover:text-black")
                }
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-white" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 sm:pt-28 pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 border border-gray-200 bg-white rounded-full px-4 py-2 shadow-sm text-xs sm:text-sm font-bold text-gray-600">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {tr.badge}
            </div>

            <p className="mt-7 text-xs sm:text-sm font-black tracking-[0.28em] text-gray-400">
              {tr.brand}
            </p>

            <h1 className="mt-5 text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.045em] leading-[1.02]">
              {tr.title}
              <br />
              <span className="text-gray-500">{tr.title2}</span>
            </h1>

            <p className="mt-7 text-lg sm:text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
              {tr.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mt-10">
              <Link
                href="/select-business"
                className="bg-black text-white px-8 py-4 rounded-xl text-base sm:text-lg font-black shadow-lg hover:bg-gray-800 transition"
              >
                {tr.book} →
              </Link>

              <Link
                href="/business/login"
                className="bg-white border border-gray-200 text-black px-8 py-4 rounded-xl text-base sm:text-lg font-black shadow-sm hover:bg-gray-50 transition"
              >
                {tr.businessDashboard}
              </Link>

              <Link
                href="/barber/login"
                className="bg-white border border-gray-200 text-black px-8 py-4 rounded-xl text-base sm:text-lg font-black shadow-sm hover:bg-gray-50 transition"
              >
                {tr.barberDashboard}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCT SHOWCASE */}
      <section className="px-6 py-20 sm:py-28 bg-[#f7f7f5]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-black tracking-[0.25em] text-gray-400">
              {tr.productEyebrow}
            </p>

            <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              {tr.productTitle}
              <br />
              <span className="text-gray-500">{tr.productTitle2}</span>
            </h2>

            <p className="mt-5 text-gray-500 text-lg leading-relaxed">
              {tr.productText}
            </p>
          </div>

          {/* DASHBOARD MOCKUP */}
          <div className="mt-14 bg-white border border-gray-200 rounded-[28px] shadow-2xl shadow-gray-200/60 overflow-hidden">
            <div className="border-b border-gray-100 px-5 sm:px-7 py-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  FLOWPAYDR BOOKING
                </p>

                <h3 className="font-black text-lg sm:text-xl mt-1">
                  {lang === "es"
                    ? "Panel del Negocio — FlowPayDR"
                    : "Business Dashboard — FlowPayDR"}
                </h3>
              </div>

              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              </div>
            </div>

            <div className="grid lg:grid-cols-[1.4fr_0.6fr]">
              <div className="p-5 sm:p-8 border-b lg:border-b-0 lg:border-r border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-sm text-gray-400">{tr.today}</p>

                    <p className="font-black text-2xl mt-1">
                      3 {tr.appointments}
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center text-xl">
                    📅
                  </div>
                </div>

                <div className="space-y-3">
                  <AppointmentRow
                    time="1:30 PM"
                    name="Hector"
                    service={lang === "es" ? "Corte" : "Haircut"}
                    status={tr.completed}
                    type="completed"
                  />

                  <AppointmentRow
                    time="2:45 PM"
                    name="Carolina"
                    service={
                      lang === "es"
                        ? "Corte + Barba"
                        : "Haircut + Beard"
                    }
                    status={tr.confirmed}
                    type="confirmed"
                  />

                  <AppointmentRow
                    time="3:00 PM"
                    name="Samuel"
                    service={lang === "es" ? "Corte" : "Haircut"}
                    status={tr.noShow}
                    type="noshow"
                  />
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-black">{tr.calendar}</h4>

                    <span className="text-sm font-bold text-gray-400">
                      {lang === "es"
                        ? "Septiembre 2026"
                        : "September 2026"}
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(
                      (day) => (
                        <div
                          key={day}
                          className={
                            "aspect-square rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold " +
                            (day === 17
                              ? "bg-black text-white"
                              : day === 18
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-50 text-gray-500")
                          }
                        >
                          {day}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-8 bg-gray-50/50">
                <DashboardStat
                  icon="👥"
                  label={tr.customers}
                  value="24"
                />

                <DashboardStat
                  icon="📅"
                  label={tr.appointments}
                  value="38"
                />

                <div className="mt-5 bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="w-16 h-16 mx-auto grid grid-cols-5 gap-[2px] bg-white p-1 border border-gray-100 rounded-lg">
                    {Array.from({ length: 25 }, (_, i) => (
                      <span
                        key={i}
                        className={
                          "block rounded-[1px] " +
                          ([
                            0, 1, 2, 5, 7, 10, 11, 12, 14, 16, 18, 20,
                            22, 23, 24,
                          ].includes(i)
                            ? "bg-black"
                            : "bg-gray-100")
                        }
                      />
                    ))}
                  </div>

                  <h4 className="font-black text-center mt-4">
                    {tr.qrTitle}
                  </h4>

                  <p className="text-sm text-gray-400 text-center mt-2 leading-relaxed">
                    {tr.qrText}
                  </p>
                </div>

                <div className="mt-4 bg-black text-white rounded-2xl p-5">
                  <div className="text-2xl">💈</div>

                  <h4 className="font-black mt-3">{tr.teamTitle}</h4>

                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                    {tr.teamText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CUSTOMER / BUSINESS */}
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-[28px] p-8 sm:p-10">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">
                📅
              </div>

              <h2 className="text-3xl font-black mt-7">
                {tr.customerTitle}
              </h2>

              <p className="text-gray-500 leading-relaxed mt-4">
                {tr.customerText}
              </p>

              <Link
                href="/select-business"
                className="inline-flex mt-8 bg-black text-white px-6 py-3.5 rounded-xl font-black hover:bg-gray-800 transition"
              >
                {tr.customerButton} →
              </Link>
            </div>

            <div className="bg-black text-white rounded-[28px] p-8 sm:p-10">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
                💼
              </div>

              <h2 className="text-3xl font-black mt-7">
                {tr.businessTitle}
              </h2>

              <p className="text-gray-400 leading-relaxed mt-4">
                {tr.businessText}
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mt-8">
                <Link
                  href="/business/register"
                  className="bg-white text-black px-5 py-4 rounded-xl text-center hover:bg-gray-100 transition"
                >
                  <span className="block font-black">
                    🏢 {tr.businessRegister}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1 font-semibold">
                    {tr.businessRegisterSub}
                  </span>
                </Link>

                <Link
                  href={`/register-barber?lang=${lang}`}
                  className="bg-white text-black px-5 py-4 rounded-xl text-center hover:bg-gray-100 transition"
                >
                  <span className="block font-black">
                    💈 {tr.barberRegister}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1 font-semibold">
                    {tr.barberRegisterSub}
                  </span>
                </Link>

                <Link
                  href="/business/login"
                  className="border border-gray-700 text-white px-5 py-3.5 rounded-xl font-black text-center hover:bg-gray-900 transition"
                >
                  {tr.businessDashboard}
                </Link>

                <Link
                  href="/barber/login"
                  className="border border-gray-700 text-white px-5 py-3.5 rounded-xl font-black text-center hover:bg-gray-900 transition"
                >
                  {tr.barberDashboard}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-gray-950 text-white px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-[0.25em] text-gray-500">
              {tr.whyEyebrow}
            </p>

            <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight">
              {tr.whyTitle}
              <br />
              <span className="text-gray-500">{tr.whyTitle2}</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            <Feature
              icon="📅"
              title={tr.feature1Title}
              text={tr.feature1Text}
            />

            <Feature
              icon="🔔"
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
      <section className="px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-black tracking-[0.25em] text-gray-400">
              {tr.categoriesEyebrow}
            </p>

            <h2 className="text-4xl sm:text-5xl font-black mt-4">
              {tr.categoriesTitle}
            </h2>

            <p className="text-gray-500 text-lg mt-4">
              {tr.categoriesText}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-12">
            {categories.map((category) => (
              <div
                key={category.label}
                className="group bg-gray-50 border border-gray-100 rounded-2xl p-6 sm:p-8 min-h-[160px] flex flex-col justify-between hover:bg-black hover:text-white transition"
              >
                <div className="text-3xl">{category.icon}</div>

                <h3 className="font-black text-lg sm:text-xl mt-8">
                  {category.label}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-[#f7f7f5] px-6 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-black tracking-[0.25em] text-gray-400">
              {tr.howEyebrow}
            </p>

            <h2 className="text-4xl sm:text-5xl font-black mt-4">
              {tr.howTitle}
            </h2>

            <p className="text-gray-500 text-lg mt-4">
              {tr.howText}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mt-12">
            <Step
              number="01"
              title={tr.step1}
              text={tr.step1Text}
            />

            <Step
              number="02"
              title={tr.step2}
              text={tr.step2Text}
            />

            <Step
              number="03"
              title={tr.step3}
              text={tr.step3Text}
            />

            <Step
              number="04"
              title={tr.step4}
              text={tr.step4Text}
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-24 sm:py-32">
        <div className="max-w-5xl mx-auto bg-black text-white rounded-[32px] px-7 sm:px-14 py-14 sm:py-20 text-center">
          <p className="text-xs font-black tracking-[0.25em] text-gray-500">
            {tr.finalEyebrow}
          </p>

          <h2 className="text-3xl sm:text-5xl font-black mt-5 tracking-tight">
            {tr.finalTitle}
            <br />
            <span className="text-gray-400">{tr.finalTitle2}</span>
          </h2>

          <p className="text-gray-400 text-lg max-w-2xl mx-auto mt-5">
            {tr.finalText}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mt-9">
            <Link
              href="/select-business"
              className="bg-white text-black px-8 py-4 rounded-xl font-black hover:bg-gray-100 transition"
            >
              {tr.book} →
            </Link>

            <Link
              href="/business/login"
              className="border border-gray-700 px-8 py-4 rounded-xl font-black hover:bg-gray-900 transition"
            >
              {tr.businessDashboard}
            </Link>

            <Link
              href="/barber/login"
              className="border border-gray-700 px-8 py-4 rounded-xl font-black hover:bg-gray-900 transition"
            >
              {tr.barberDashboard}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-9 flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
          <div>
            <div className="font-black">
              FLOWPAYDR
              <span className="text-gray-400"> BOOKING</span>
            </div>

            <p className="text-sm text-gray-400 mt-1">
              {tr.footerText}
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-sm font-bold">
            <Link
              href="/select-business"
              className="text-gray-500 hover:text-black"
            >
              {tr.footerMarketplace}
            </Link>

            <Link
              href="/business/register"
              className="text-gray-500 hover:text-black"
            >
              {tr.footerRegister}
            </Link>

            <Link
              href="/business/login"
              className="text-gray-500 hover:text-black"
            >
              {tr.businessDashboard}
            </Link>

            <Link
              href="/barber/login"
              className="text-gray-500 hover:text-black"
            >
              {tr.barberDashboard}
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-8">
          <p className="text-xs text-gray-300">
            © 2026 FlowPayDR
          </p>
        </div>
      </footer>
    </main>
  );
}

function AppointmentRow({
  time,
  name,
  service,
  status,
  type,
}) {
  const statusClass =
    type === "completed"
      ? "bg-green-50 text-green-700"
      : type === "noshow"
      ? "bg-amber-50 text-amber-700"
      : "bg-blue-50 text-blue-700";

  return (
    <div className="border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="font-black text-sm whitespace-nowrap">
          {time}
        </div>

        <div className="min-w-0">
          <p className="font-bold truncate">{name}</p>

          <p className="text-xs text-gray-400 truncate">
            {service}
          </p>
        </div>
      </div>

      <span
        className={
          "hidden sm:inline-flex text-xs font-black px-3 py-1.5 rounded-full " +
          statusClass
        }
      >
        {status}
      </span>
    </div>
  );
}

function DashboardStat({ icon, label, value }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-3 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400">{label}</p>

        <p className="text-3xl font-black mt-1">{value}</p>
      </div>

      <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-xl">
        {icon}
      </div>
    </div>
  );
}

function Feature({ icon, title, text }) {
  return (
    <div className="border border-gray-800 bg-gray-900/60 rounded-2xl p-6 sm:p-7">
      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl">
        {icon}
      </div>

      <h3 className="text-xl font-black mt-6">{title}</h3>

      <p className="text-gray-400 leading-relaxed mt-3">
        {text}
      </p>
    </div>
  );
}

function Step({ number, title, text }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <span className="text-sm font-black text-gray-300">
        {number}
      </span>

      <h3 className="text-xl font-black mt-8">{title}</h3>

      <p className="text-gray-500 leading-relaxed mt-3">
        {text}
      </p>
    </div>
  );
}