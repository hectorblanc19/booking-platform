"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function WelcomePage() {
  const [lang, setLang] = useState("es");
  const [businesses, setBusinesses] = useState([]);
  const [independentBarbers, setIndependentBarbers] = useState([]);

  const t = {
    es: {
      title: "Reserva Fácil. Rápido. Profesional.",
      subtitle: "Barberías, salones, uñas, spas, car wash y más.",
      chooseBusiness: "Selecciona un negocio",
      viewAll: "Ver todos los negocios",
      login: "Entrar al Panel",
      footer: "FlowPayDR — Plataforma de Reservas",
      independent: "Barberos Independientes",
      noIndependent: "No hay barberos independientes.",
      phone: "Teléfono",
      days: "Días",
    },
    en: {
      title: "Easy Booking. Fast. Professional.",
      subtitle: "Barbershops, salons, nails, spas, car wash and more.",
      chooseBusiness: "Select a business",
      viewAll: "View all businesses",
      login: "Login to Dashboard",
      footer: "FlowPayDR — Booking Platform",
      independent: "Independent Barbers",
      noIndependent: "No independent barbers available.",
      phone: "Phone",
      days: "Days",
    },
  };

  const tr = t[lang];

  useEffect(() => {
    loadBusinesses();
    loadIndependentBarbers();
  }, []);

  // ⭐ BUSINESS RATINGS ADDED HERE
  async function loadBusinesses() {
    const { data: businesses } = await supabase
      .from("businesses")
      .select("*")
      .limit(4);

    if (!businesses) {
      setBusinesses([]);
      return;
    }

    // ⭐ Add rating to each business
    for (const business of businesses) {
      // Fetch barbers inside this business
      const { data: barbers } = await supabase
        .from("barbers")
        .select("id")
        .eq("business_id", business.id);

      if (!barbers || barbers.length === 0) {
        business.avgRating = null;
        continue;
      }

      // Fetch ratings for all barbers in this business
      const barberIds = barbers.map((b) => b.id);

      const { data: ratings } = await supabase
        .from("ratings")
        .select("rating")
        .in("barber_id", barberIds);

      if (ratings && ratings.length > 0) {
        const avg =
          ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        business.avgRating = avg.toFixed(1);
      } else {
        business.avgRating = null;
      }
    }

    setBusinesses(businesses);
  }

  async function loadIndependentBarbers() {
    const { data: barbers } = await supabase
      .from("barbers")
      .select("*")
      .is("business_id", null);

    if (!barbers) {
      setIndependentBarbers([]);
      return;
    }

    // ⭐ Fetch average rating for each independent barber
    for (const barber of barbers) {
      const { data: ratings } = await supabase
        .from("ratings")
        .select("rating")
        .eq("barber_id", barber.id);

      if (ratings && ratings.length > 0) {
        const avg =
          ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        barber.avgRating = avg.toFixed(1);
      } else {
        barber.avgRating = null;
      }
    }

    setIndependentBarbers(barbers);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Language Toggle */}
      <div className="flex justify-end p-4 gap-2">
        <button
          className={`px-3 py-1 rounded ${
            lang === "es" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
        <button
          className={`px-3 py-1 rounded ${
            lang === "en" ? "bg-black text-white" : "bg-gray-200"
          }`}
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

                {/* ⭐ BUSINESS RATING */}
                {b.avgRating ? (
                  <p className="text-yellow-500 font-bold">
                    ⭐ {b.avgRating} / 5
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">No ratings yet</p>
                )}

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

      {/* INDEPENDENT BARBERS */}
      <div className="mt-16 px-6 max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6">{tr.independent}</h2>

        {independentBarbers.length === 0 && (
          <p className="text-gray-500 text-sm">{tr.noIndependent}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {independentBarbers.map((barber) => {
            const dayMapES = {
              mon: "Lunes",
              tue: "Martes",
              wed: "Miércoles",
              thu: "Jueves",
              fri: "Viernes",
              sat: "Sábado",
              sun: "Domingo",
            };

            const dayMapEN = {
              mon: "Monday",
              tue: "Tuesday",
              wed: "Wednesday",
              thu: "Thursday",
              fri: "Friday",
              sat: "Saturday",
              sun: "Sunday",
            };

            const dayMap = lang === "es" ? dayMapES : dayMapEN;

            const orderedDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

            const displayDays = orderedDays
              .filter((d) => barber.working_days?.includes(d))
              .map((d) => dayMap[d])
              .join(", ");

            return (
              <Link key={barber.id} href={`/booking/${barber.id}`}>
                <div className="p-5 bg-white rounded-xl shadow hover:shadow-lg transition cursor-pointer">
                  <h3 className="text-xl font-semibold">{barber.name}</h3>

                  {/* ⭐ Rating */}
                  {barber.avgRating ? (
                    <p className="text-yellow-500 font-bold">
                      ⭐ {barber.avgRating} / 5
                    </p>
                  ) : (
                    <p className="text-gray-400 text-sm">No ratings yet</p>
                  )}

                  {barber.phone && (
                    <p className="text-gray-600">
                      {tr.phone}: {barber.phone}
                    </p>
                  )}

                  {barber.working_days && (
                    <p className="text-gray-600">
                      {tr.days}: {displayDays}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-auto text-center py-6 text-gray-500">
        {tr.footer}
      </div>
    </div>
  );
}
