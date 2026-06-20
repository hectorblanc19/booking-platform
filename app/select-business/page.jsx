"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function WelcomePage() {
  const [lang, setLang] = useState("es");
  const [businesses, setBusinesses] = useState([]);

  const t = {
    es: {
      title: "Reserva Fácil. Rápido. Profesional.",
      subtitle: "Barberías, salones, uñas, spas, car wash y más.",
      chooseBusiness: "Selecciona un negocio",
      viewAll: "Ver todos los negocios",
      login: "Entrar al Panel",
      footer: "FlowPayDR — Plataforma de Reservas",
    },
    en: {
      title: "Easy Booking. Fast. Professional.",
      subtitle: "Barbershops, salons, nails, spas, car wash and more.",
      chooseBusiness: "Select a business",
      viewAll: "View all businesses",
      login: "Login to Dashboard",
      footer: "FlowPayDR — Booking Platform",
    },
  };

  const tr = t[lang];

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function loadBusinesses() {
    const { data } = await supabase.from("businesses").select("*").limit(4);
    setBusinesses(data || []);
  }

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

      {/* HERO */}
      <div className="flex flex-col items-center text-center px-6 mt-10">
        <h1 className="text-4xl font-bold mb-3">{tr.title}</h1>
        <p className="text-lg text-gray-600 max-w-xl">{tr.subtitle}</p>

        <div className="flex gap-4 mt-8">
          <Link href="/select-business">
            <button className="bg-blue-600 text-white px-6 py-3 rounded-xl text-lg shadow">
              {tr.viewAll}
            </button>
          </Link>

          {/* ⭐ FIXED: Now goes to /barber/login instead of /admin */}
          <Link href="/barber/login">
            <button className="bg-gray-200 px-6 py-3 rounded-xl text-lg shadow">
              {tr.login}
            </button>
          </Link>
        </div>
      </div>

      {/* FEATURED BUSINESSES */}
      <div className="mt-16 px-6 max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6">{tr.chooseBusiness}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {businesses.map((b) => (
            <Link key={b.id} href={`/select-barber/${b.id}`}>
              <div className="p-5 bg-white rounded-xl shadow hover:shadow-lg transition cursor-pointer">
                <h3 className="text-xl font-semibold">{b.name}</h3>
                <p className="text-gray-600">{b.address || "Sin dirección"}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-6">
          <Link href="/select-business" className="text-blue-600 underline">
            {tr.viewAll}
          </Link>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-auto text-center py-6 text-gray-500">
        {tr.footer}
      </div>
    </div>
  );
}
