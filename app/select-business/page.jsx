"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function WelcomePage() {
  const [lang, setLang] = useState("es");
  const [businesses, setBusinesses] = useState([]);
  const [independentBarbers, setIndependentBarbers] = useState([]);
  const [publishedProfileBusinessIds, setPublishedProfileBusinessIds] =
    useState(new Set());
  const [loading, setLoading] = useState(true);

  // NEW: SEARCH + CATEGORY FILTER
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const t = {
    es: {
      brand: "FLOWPAYDR BOOKING",
      title: "Selecciona dónde quieres reservar",
      subtitle:
        "Elige un negocio o profesional para comenzar tu reserva.",

      businesses: "Negocios y Profesionales",
      independent: "Barberos Independientes",

      noBusinesses: "No hay negocios disponibles.",
      noIndependent: "No hay barberos independientes disponibles.",
      noResults:
        "No encontramos negocios o profesionales con esos filtros.",

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

      searchPlaceholder: "Buscar negocio o profesional...",
      categories: "Categorías",
      all: "Todos",

      categoryBarber: "Barberías y Barberos",
      categoryNails: "Uñas",
      categorySalon: "Salones",
      categorySpa: "Spas",
      categoryVet: "Veterinarios",
      categoryCarWash: "Car Wash",
    },

    en: {
      brand: "FLOWPAYDR BOOKING",
      title: "Select where you want to book",
      subtitle:
        "Choose a business or professional to start your booking.",

      businesses: "Businesses & Professionals",
      independent: "Independent Barbers",

      noBusinesses: "No businesses available.",
      noIndependent: "No independent barbers available.",
      noResults:
        "We couldn't find any businesses or professionals with those filters.",

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

      searchPlaceholder: "Search business or professional...",
      categories: "Categories",
      all: "All",

      categoryBarber: "Barbershops & Barbers",
      categoryNails: "Nails",
      categorySalon: "Salons",
      categorySpa: "Spas",
      categoryVet: "Veterinarians",
      categoryCarWash: "Car Wash",
    },
  };

  const tr = t[lang];

  /*
   * ---------------------------------------------------
   * LOAD BUSINESSES / BARBERS / RATINGS
   * ---------------------------------------------------
   */
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        /*
         * STAGE 1 PERFORMANCE OPTIMIZATION
         *
         * Only 3 main queries:
         *
         * 1. Businesses
         * 2. Independent barbers
         * 3. Ratings
         */

        const [
          businessResult,
          barberResult,
          ratingResult,
          publishedProfileResult,
        ] = await Promise.all([
          supabase
            .from("businesses")
            .select("id, name, address, map_url, category, booking_system")
            .limit(20),

          supabase
            .from("barbers")
            .select("id, name, phone, working_days")
            .is("business_id", null)
            .eq("active", true),

          supabase
            .from("ratings")
            .select("barber_id, business_id, rating"),

          supabase
            .from("business_profile_settings")
            .select("business_id")
            .eq("published", true),
        ]);

        /*
         * CHECK ERRORS
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

        if (publishedProfileResult.error) {
          console.error(
            "Error loading published business profiles:",
            publishedProfileResult.error
          );
        }

        const businessData = businessResult.data || [];
        const barberData = barberResult.data || [];
        const ratingData = ratingResult.data || [];

        const publishedBusinessIds = new Set(
          (publishedProfileResult.data || []).map(function (profile) {
            return profile.business_id;
          })
        );

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
        setPublishedProfileBusinessIds(publishedBusinessIds);
      } catch (error) {
        console.error(
          "Error loading booking directory:",
          error
        );

        setBusinesses([]);
        setIndependentBarbers([]);
        setPublishedProfileBusinessIds(new Set());
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /*
   * ---------------------------------------------------
   * DAYS
   * ---------------------------------------------------
   */

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

  /*
   * ---------------------------------------------------
   * CATEGORY HELPERS
   * ---------------------------------------------------
   */

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  // Tours stay in the system, but are hidden from the public marketplace.
  function isTourCategory(category) {
    const value = normalizeText(category);

    return (
      value.includes("tour") ||
      value.includes("excursion")
    );
  }

  /*
   * This converts similar category names into one filter.
   *
   * Example:
   *
   * barber
   * barberia
   * barbería
   * barbershop
   *
   * all become:
   *
   * barber
   */

  function getCategoryKey(category) {
    const value = normalizeText(category);

    if (!value) {
      return "other";
    }

    if (
      value.includes("barber") ||
      value.includes("barbero")
    ) {
      return "barber";
    }

    if (
      value.includes("nail") ||
      value.includes("una") ||
      value.includes("manicure") ||
      value.includes("pedicure")
    ) {
      return "nails";
    }

    if (
      value.includes("salon") ||
      value.includes("peluquer")
    ) {
      return "salon";
    }

    if (value.includes("spa")) {
      return "spa";
    }

    if (
      value.includes("vet") ||
      value.includes("veterinar") ||
      value.includes("pet")
    ) {
      return "veterinarian";
    }

    if (
      value.includes("car wash") ||
      value.includes("carwash") ||
      value.includes("lavado")
    ) {
      return "carwash";
    }

    /*
     * Any future category automatically gets its own filter.
     */
    return value;
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .split(" ")
      .filter(Boolean)
      .map(function (word) {
        return (
          word.charAt(0).toUpperCase() +
          word.slice(1)
        );
      })
      .join(" ");
  }

  function getCategoryLabel(categoryKey) {
    switch (categoryKey) {
      case "barber":
        return tr.categoryBarber;

      case "nails":
        return tr.categoryNails;

      case "salon":
        return tr.categorySalon;

      case "spa":
        return tr.categorySpa;

      case "veterinarian":
        return tr.categoryVet;

      case "carwash":
        return tr.categoryCarWash;

      case "other":
        return lang === "es" ? "Otros" : "Other";

      default:
        return titleCase(categoryKey);
    }
  }

  // Public marketplace list. Tour businesses are intentionally excluded.
  const visibleBusinesses = businesses.filter(function (business) {
    return !isTourCategory(business.category);
  });

  /*
   * ---------------------------------------------------
   * AVAILABLE CATEGORIES
   * ---------------------------------------------------
   *
   * Categories come from Supabase automatically.
   *
   * We also add "barber" if there are independent barbers.
   */

  const categoryKeys = Array.from(
    new Set([
      ...visibleBusinesses.map(function (business) {
        return getCategoryKey(business.category);
      }),

      ...(independentBarbers.length > 0
        ? ["barber"]
        : []),
    ])
  ).filter(Boolean);

  /*
   * Put common categories first.
   * Future categories still appear automatically after them.
   */

  const preferredOrder = [
    "barber",
    "nails",
    "salon",
    "spa",
    "veterinarian",
    "carwash",
  ];

  const sortedCategoryKeys = categoryKeys.sort(function (a, b) {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    if (aIndex !== -1) {
      return -1;
    }

    if (bIndex !== -1) {
      return 1;
    }

    return getCategoryLabel(a).localeCompare(
      getCategoryLabel(b)
    );
  });

  /*
   * ---------------------------------------------------
   * SEARCH + FILTER BUSINESSES
   * ---------------------------------------------------
   */

  const normalizedSearch = normalizeText(searchTerm);

  const filteredBusinesses = visibleBusinesses.filter(
    function (business) {
      const categoryKey = getCategoryKey(
        business.category
      );

      const matchesCategory =
        selectedCategory === "all" ||
        categoryKey === selectedCategory;

      const searchableText = normalizeText(
        [
          business.name,
          business.category,
          business.address,
        ].join(" ")
      );

      const matchesSearch =
        normalizedSearch === "" ||
        searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    }
  );

  /*
   * ---------------------------------------------------
   * SEARCH + FILTER INDEPENDENT BARBERS
   * ---------------------------------------------------
   *
   * Independent barbers always belong to barber category.
   */

  const filteredIndependentBarbers =
    independentBarbers.filter(function (barber) {
      const matchesCategory =
        selectedCategory === "all" ||
        selectedCategory === "barber";

      const searchableText = normalizeText(
        [
          barber.name,
          barber.phone,
          "barber",
          "barbero",
          "barberia",
        ].join(" ")
      );

      const matchesSearch =
        normalizedSearch === "" ||
        searchableText.includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });

  const hasAnyResults =
    filteredBusinesses.length > 0 ||
    filteredIndependentBarbers.length > 0;

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

            {/* CHANGED TO GENERAL LOGIN */}
            <Link
              href="/login"
              className="hidden sm:block text-sm font-semibold text-gray-600 hover:text-black"
            >
              {tr.login}
            </Link>

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

        </div>

      </header>

      {/* HERO */}
      <section className="px-6 pt-12 pb-8">

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

      {/* SEARCH + FILTERS */}
      <section className="px-6 pb-10">

        <div className="max-w-5xl mx-auto">

          {/* SEARCH */}
          <div className="relative">

            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={function (event) {
                setSearchTerm(event.target.value);
              }}
              placeholder={tr.searchPlaceholder}
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-12 pr-4 text-base outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition"
            />

          </div>

          {/* CATEGORY FILTERS */}
          {sortedCategoryKeys.length > 0 && (

            <div className="mt-6">

              <p className="text-sm font-bold text-gray-500 mb-3">
                {tr.categories}
              </p>

              <div className="flex flex-wrap gap-2">

                {/* ALL */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory("all")
                  }
                  className={
                    "px-4 py-2 rounded-full text-sm font-bold border transition " +
                    (selectedCategory === "all"
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400")
                  }
                >
                  {tr.all}
                </button>

                {/* DYNAMIC CATEGORIES */}
                {sortedCategoryKeys.map(function (
                  categoryKey
                ) {
                  return (
                    <button
                      key={categoryKey}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(categoryKey)
                      }
                      className={
                        "px-4 py-2 rounded-full text-sm font-bold border transition " +
                        (selectedCategory === categoryKey
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400")
                      }
                    >
                      {getCategoryLabel(categoryKey)}
                    </button>
                  );
                })}

              </div>

            </div>

          )}

        </div>

      </section>

      {/* MAIN CONTENT */}
      <section className="px-6 pb-16">

        <div className="max-w-5xl mx-auto">

          {loading ? (

            <div className="text-center py-16 text-gray-500">
              {tr.loading}
            </div>

          ) : !hasAnyResults ? (

            /*
             * NO SEARCH / FILTER RESULTS
             */

            <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center shadow-sm">

              <div className="text-4xl mb-4">
                🔎
              </div>

              <p className="text-gray-500">
                {tr.noResults}
              </p>

              <button
                type="button"
                onClick={function () {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
                className="mt-5 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition"
              >
                {tr.all}
              </button>

            </div>

          ) : (

            <>

              {/* BUSINESSES */}
              {filteredBusinesses.length > 0 && (

                <div className="mb-14">

                  <h2 className="text-2xl font-black mb-6">
                    {tr.businesses}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                    {filteredBusinesses.map(
                      function (business) {
                        const normalizedCategory =
                          normalizeText(
                            business.category
                          );

                        /*
                         * IMPORTANT:
                         * KEEP EXISTING BARBER ROUTING.
                         */

                        const isBarberBusiness =
                          normalizedCategory.includes(
                            "barber"
                          ) ||
                          normalizedCategory.includes(
                            "barbero"
                          );

                        const hasPublishedProfile =
                          publishedProfileBusinessIds.has(
                            business.id
                          );

                        const isProviderBusiness =
                          business.booking_system === "provider";

                        const bookingHref =
                          isBarberBusiness && !isProviderBusiness
                            ? `/select-barber/${business.id}`
                            : hasPublishedProfile
                            ? `/business/${business.id}/profile`
                            : `/business/${business.id}/booking`;

                        const categoryKey =
                          getCategoryKey(
                            business.category
                          );

                        return (

                          <Link
                            key={business.id}
                            href={bookingHref}
                            className="block"
                          >

                            <div className="h-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition">

                              {/* CATEGORY */}
                              <div className="mb-3">

                                <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                                  {getCategoryLabel(
                                    categoryKey
                                  )}
                                </span>

                              </div>

                              {/* NAME */}
                              <h3 className="text-xl font-bold">
                                {business.name}
                              </h3>

                              {/* RATING */}
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

                              {/* ADDRESS */}
                              <p className="text-gray-500 mt-3">
                                {business.address ||
                                  tr.noAddress}
                              </p>

                              {/* MAP */}
                              {business.map_url && (

                                <button
                                  type="button"
                                  className="text-blue-600 underline text-sm inline-block mt-3"
                                  onClick={function (
                                    event
                                  ) {
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

                              {/* SELECT */}
                              <div className="mt-5 text-sm font-bold text-black">
                                {tr.select}
                              </div>

                            </div>

                          </Link>

                        );
                      }
                    )}

                  </div>

                </div>

              )}

              {/* INDEPENDENT BARBERS */}
              {filteredIndependentBarbers.length >
                0 && (

                <div>

                  <h2 className="text-2xl font-black mb-6">
                    {tr.independent}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                    {filteredIndependentBarbers.map(
                      function (barber) {
                        const displayDays =
                          orderedDays
                            .filter(function (day) {
                              return (
                                barber.working_days &&
                                barber.working_days.includes(
                                  day
                                )
                              );
                            })
                            .map(function (day) {
                              return dayMap[day];
                            })
                            .join(", ");

                        return (

                          <Link
                            key={barber.id}
                            href={
                              "/booking/" +
                              barber.id
                            }
                            className="block"
                          >

                            <div className="h-full bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition">

                              {/* CATEGORY */}
                              <div className="mb-3">

                                <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                                  {lang === "es"
                                    ? "Barbero Independiente"
                                    : "Independent Barber"}
                                </span>

                              </div>

                              {/* NAME */}
                              <h3 className="text-xl font-bold">
                                {barber.name}
                              </h3>

                              {/* RATING */}
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

                              {/* PHONE */}
                              {barber.phone && (

                                <p className="text-gray-500 mt-3">
                                  {tr.phone}:{" "}
                                  {barber.phone}
                                </p>

                              )}

                              {/* DAYS */}
                              {barber.working_days && (

                                <p className="text-gray-500 mt-1">
                                  {tr.days}:{" "}
                                  {displayDays}
                                </p>

                              )}

                              {/* BOOK */}
                              <div className="mt-5 text-sm font-bold text-black">
                                {tr.book}
                              </div>

                            </div>

                          </Link>

                        );
                      }
                    )}

                  </div>

                </div>

              )}

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