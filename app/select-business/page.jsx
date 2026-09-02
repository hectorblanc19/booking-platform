
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function WelcomePage() {
  const [lang, setLang] = useState("es");
  const [businesses, setBusinesses] = useState([]);
  const [independentBarbers, setIndependentBarbers] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = {
    es: {
      brand: "FLOWPAYDR BOOKING",
      title: "Selecciona dónde quieres reservar",
      subtitle:
        "Elige una barbería, barbero independiente o profesional para comenzar tu reserva.",
      businesses: "Barberías y Negocios",
      independent: "Barberos Independientes",
      noBusinesses: "No hay negocios disponibles.",
      noIndependent: "No hay barberos independientes disponibles.",
      phone: "Teléfono",
      days: "Días",
      mapLink: "Ver ubicación en Google Maps",
      noRatings: "Sin calificaciones",
      back: "← Volver",
      login: "Entrar al Panel",
      select: "Seleccionar →",
      book: "Reservar →",
      loading: "Cargando...",
      noAddress: "Sin dirección",
    },

    en: {
      brand: "FLOWPAYDR BOOKING",
      title: "Select where you want to book",
      subtitle:
        "Choose a barbershop, independent barber or professional to start your booking.",
      businesses: "Barbershops & Businesses",
      independent: "Independent Barbers",
      noBusinesses: "No businesses available.",
      noIndependent: "No independent barbers available.",
      phone: "Phone",
      days: "Days",
      mapLink: "View location on Google Maps",
      noRatings: "No ratings yet",
      back: "← Back",
      login: "Login to Dashboard",
      select: "Select →",
      book: "Book →",
      loading: "Loading...",
      noAddress: "No address",
    },
  };

  const tr = t[lang];

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        /*
         * STAGE 1 PERFORMANCE OPTIMIZATION
         *
         * Instead of querying ratings separately for every
         * business and every barber, we make only 3 queries:
         *
         * 1. Businesses
         * 2. Independent barbers
         * 3. All ratings
         */

        const [businessResult, barberResult, ratingResult] =
          await Promise.all([
            supabase
              .from("businesses")
              .select("id, name, address, map_url")
              .limit(4),

            supabase
              .from("barbers")
              .select("id, name, phone, working_days")
              .is("business_id", null)
              .eq("active", true),

            supabase
              .from("ratings")
              .select("barber_id, business_id, rating"),
          ]);

        /*
         * Check for query errors.
         */
        if (businessResult.error) {
          console.error(
            "Error loading businesses:",
            businessResult.error
          );
        }

        if (barberResult.error) {
          console.error(
            "Error loading independent barbers:",
            barberResult.error
          );
        }

        if (ratingResult.error) {
          console.error(
            "Error loading ratings:",
            ratingResult.error
          );
        }

        const businessData = businessResult.data || [];
        const barberData = barberResult.data || [];
        const ratingData = ratingResult.data || [];

        /*
         * ---------------------------------------------------
         * CALCULATE BUSINESS RATINGS
         * ---------------------------------------------------
         */

        const businessRatings = {};

        ratingData.forEach(function (rating) {
          if (!rating.business_id || rating.rating == null) {
            return;
          }

          if (!businessRatings[rating.business_id]) {
            businessRatings[rating.business_id] = {
              total: 0,
              count: 0,
            };
          }

          businessRatings[rating.business_id].total += Number(
            rating.rating
          );

          businessRatings[rating.business_id].count += 1;
        });

        const businessesWithRatings = businessData.map(
          function (business) {
            const stats = businessRatings[business.id];

            return {
              ...business,
              avgRating:
                stats && stats.count > 0
                  ? (stats.total / stats.count).toFixed(1)
                  : null,
            };
          }
        );

        /*
         * ---------------------------------------------------
         * CALCULATE INDEPENDENT BARBER RATINGS
         * ---------------------------------------------------
         */

        const barberRatings = {};

        ratingData.forEach(function (rating) {
          if (!rating.barber_id || rating.rating == null) {
            return;
          }

          if (!barberRatings[rating.barber_id]) {
            barberRatings[rating.barber_id] = {
              total: 0,
              count: 0,
            };
          }

          barberRatings[rating.barber_id].total += Number(
            rating.rating
          );

          barberRatings[rating.barber_id].count += 1;
        });

        const barbersWithRatings = barberData.map(function (barber) {
          const stats = barberRatings[barber.id];

          return {
            ...barber,
            avgRating:
              stats && stats.count > 0
                ? (stats.total / stats.count).toFixed(1)
                : null,
          };
        });

        setBusinesses(businessesWithRatings);
        setIndependentBarbers(barbersWithRatings);
      } catch (error) {
        console.error("Error loading booking directory:", error);

        setBusinesses([]);
        setIndependentBarbers([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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

  const orderedDays = [
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
    "sun",
  ];

  const dayMap = lang === "es" ? dayMapES : dayMapEN;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">

      {/* HEADER */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">

          <Link
            href="/"
            className="font-black tracking-tight text-lg"
          >
            FLOWPAYDR
            <span className="text-gray-500 font-semibold">
              {" "}BOOKING
            </span>
          </Link>

          <div className="flex items-center gap-3">

            <Link
              href="/barber/login"
              className="hidden sm:block text-sm font-semibold text-gray-600 hover:text-black"
            >
              {tr.login}
            </Link>

            <div className="flex items-center gap-1 border border-gray-200 rounded-full p-1 bg-gray-50">

              <button
                type="button"
                onClick={() => setLang("es")}
                className={
                  "px-3 py-1.5 rounded-full text-sm font-semibold " +
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
                  "px-3 py-1.5 rounded-full text-sm font-semibold " +
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
      <section className="px-6 pt-12 pb-10">
        <div className="max-w-4xl mx-auto text-center">

          <p className="text-sm font-bold tracking-[0.25em] text-gray-400 mb-4">
            {tr.brand}
          </p>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black">
            {tr.title}
          </h1>

          <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
            {tr.subtitle}
          </p>

          <Link
            href="/"
            className="inline-block mt-6 text-sm text-gray-500 hover:text-black"
          >
            {tr.back}
          </Link>

        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto">

          {loading ? (
            <div className="text-center py-16 text-gray-500">
              {tr.loading}
            </div>
          ) : (
            <>

              {/* BUSINESSES */}
              <div className="mb-14">

                <h2 className="text-2xl font-black mb-6">
                  {tr.businesses}
                </h2>

                {businesses.length === 0 ? (
                  <p className="text-gray-500">
                    {tr.noBusinesses}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                    {businesses.map(function (business) {
                      return (
                        <Link
                          key={business.id}
                          href={"/select-barber/" + business.id}
                          className="block"
                        >
                          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition">

                            <h3 className="text-xl font-bold">
                              {business.name}
                            </h3>

                            <div className="mt-2">
                              {business.avgRating ? (
                                <p className="text-yellow-500 font-bold">
                                  ⭐ {business.avgRating} / 5
                                </p>
                              ) : (
                                <p className="text-gray-400 text-sm">
                                  {tr.noRatings}
                                </p>
                              )}
                            </div>

                            <p className="text-gray-500 mt-3">
                              {business.address || tr.noAddress}
                            </p>

                            {business.map_url && (
                              <button
                                type="button"
                                className="text-blue-600 underline text-sm inline-block mt-3"
                                onClick={function (event) {
                                  event.preventDefault();
                                  event.stopPropagation();

                                  window.open(
                                    business.map_url,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }}
                              >
                                {tr.mapLink}
                              </button>
                            )}

                            <div className="mt-5 text-sm font-bold text-black">
                              {tr.select}
                            </div>

                          </div>
                        </Link>
                      );
                    })}

                  </div>
                )}

              </div>

              {/* INDEPENDENT BARBERS */}
              <div>

                <h2 className="text-2xl font-black mb-6">
                  {tr.independent}
                </h2>

                {independentBarbers.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    {tr.noIndependent}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                    {independentBarbers.map(function (barber) {

                      const displayDays = orderedDays
                        .filter(function (day) {
                          return (
                            barber.working_days &&
                            barber.working_days.includes(day)
                          );
                        })
                        .map(function (day) {
                          return dayMap[day];
                        })
                        .join(", ");

                      return (
                        <Link
                          key={barber.id}
                          href={"/booking/" + barber.id}
                          className="block"
                        >
                          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition">

                            <h3 className="text-xl font-bold">
                              {barber.name}
                            </h3>

                            <div className="mt-2">
                              {barber.avgRating ? (
                                <p className="text-yellow-500 font-bold">
                                  ⭐ {barber.avgRating} / 5
                                </p>
                              ) : (
                                <p className="text-gray-400 text-sm">
                                  {tr.noRatings}
                                </p>
                              )}
                            </div>

                            {barber.phone && (
                              <p className="text-gray-500 mt-3">
                                {tr.phone}: {barber.phone}
                              </p>
                            )}

                            {barber.working_days && (
                              <p className="text-gray-500 mt-1">
                                {tr.days}: {displayDays}
                              </p>
                            )}

                            <div className="mt-5 text-sm font-bold text-black">
                              {tr.book}
                            </div>

                          </div>
                        </Link>
                      );
                    })}

                  </div>
                )}

              </div>

            </>
          )}

        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white px-6 py-8 text-center">
        <p className="text-sm text-gray-400">
          FlowPayDR — Booking Platform
        </p>
      </footer>

    </main>
  );
}
