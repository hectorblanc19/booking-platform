"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import GetUserLocation from "./GetUserLocation";
import { calculateDistance } from "./distance";

type Barber = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  map_url: string | null;
  category: string | null;
  featured: boolean | null;
  services: string[] | null;
  distance?: number | null;
};

const translations = {
  en: {
    searchPlaceholder: "Search by name or address...",
    featured: "Featured",
    noPhoto: "No photo",
    viewMap: "View map",
    viewProfile: "View profile",
    viewSchedule: "View schedule",
    noResults: "No barbers found with these filters.",
    more: "more",
    away: "km away",
  },
  es: {
    searchPlaceholder: "Buscar por nombre o dirección...",
    featured: "Destacado",
    noPhoto: "Sin foto",
    viewMap: "Ver mapa",
    viewProfile: "Ver perfil",
    viewSchedule: "Ver horario",
    noResults: "No se encontraron barberos con estos filtros.",
    more: "más",
    away: "km de distancia",
  },
};

const serviceTranslations = {
  haircut: { en: "haircut", es: "corte de pelo" },
  beard: { en: "beard", es: "barba" },
  color: { en: "color", es: "coloración" },
  kids: { en: "kids cut", es: "corte de niños" },
  eyebrows: { en: "eyebrows", es: "cejas" },
  shave: { en: "shave", es: "afeitado" },
  design: { en: "design", es: "diseño" },
  blowout: { en: "blowout", es: "blowout" },
  shapeup: { en: "shape up", es: "retoque" },
};

export default function MarketplaceClient({
  barbers,
  lang,
}: {
  barbers: Barber[];
  lang: "en" | "es";
}) {
  const t = translations[lang];
  const router = useRouter();

  const SERVICE_FILTERS = [
    "haircut",
    "beard",
    "color",
    "kids",
    "eyebrows",
    "shave",
    "design",
    "blowout",
    "shapeup",
  ];

  const CATEGORY_FILTERS = ["barbershop", "independent"];

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  // ⭐ GPS location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // ⭐ Add distance to each barber
  const barbersWithDistance = useMemo(() => {
    if (!userLocation) return barbers;

    return barbers.map((b) => {
      if (!b.lat || !b.lng) return { ...b, distance: null };

      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        b.lat,
        b.lng
      );

      return { ...b, distance };
    });
  }, [barbers, userLocation]);

  // ⭐ Sort by nearest
  const sortedBarbers = useMemo(() => {
    return [...barbersWithDistance].sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  }, [barbersWithDistance]);

  // ⭐ Apply your existing filters AFTER sorting
  const filteredBarbers = useMemo(() => {
    return sortedBarbers.filter((b) => {
      const matchesSearch =
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        (b.address || "").toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        !selectedCategory || b.category === selectedCategory;

      const matchesFeatured = !showFeaturedOnly || !!b.featured;

      const matchesService =
        !selectedService ||
        (b.services || []).includes(selectedService.toLowerCase());

      return (
        matchesSearch && matchesCategory && matchesFeatured && matchesService
      );
    });
  }, [sortedBarbers, search, selectedCategory, showFeaturedOnly, selectedService]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-6 max-w-6xl mx-auto">
      {/* ⭐ GPS */}
      <GetUserLocation onLocation={setUserLocation} />

      {/* Language Toggle */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          onClick={() => router.push("/marketplace?lang=en")}
          className={`px-3 py-1 border rounded ${
            lang === "en" ? "bg-slate-900 text-white" : ""
          }`}
        >
          EN
        </button>

        <button
          onClick={() => router.push("/marketplace?lang=es")}
          className={`px-3 py-1 border rounded ${
            lang === "es" ? "bg-slate-900 text-white" : ""
          }`}
        >
          ES
        </button>
      </div>

      {/* Filters */}
      <section className="rounded-xl bg-white p-4 shadow-sm mb-6">
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
        />

        {/* Category filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setSelectedCategory(selectedCategory === cat ? null : cat)
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                selectedCategory === cat
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Service filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          {SERVICE_FILTERS.map((service) => {
            const translated =
              serviceTranslations[service]?.[lang] || service;

            return (
              <button
                key={service}
                onClick={() =>
                  setSelectedService(selectedService === service ? null : service)
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedService === service
                    ? "bg-blue-600 text-white"
                    : "border border-slate-300 text-slate-700"
                }`}
              >
                {translated}
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {filteredBarbers.map((barber, index) => (
          <article
            key={barber.id}
            className="overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Photo */}
            <div className="relative h-72 w-full">
              {barber.photo_url ? (
                <Image
                  src={barber.photo_url}
                  alt={barber.name}
                  fill
                  sizes="(max-width: 768px) 100vw,
                         (max-width: 1200px) 50vw,
                         33vw"
                  unoptimized
                  loading={index === 0 ? "eager" : "lazy"}
                  className="object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs text-slate-600">
                  {t.noPhoto}
                </div>
              )}

              {barber.featured && (
                <span className="absolute left-3 top-3 rounded-full bg-yellow-400 px-2 py-1 text-xs font-semibold text-slate-900 shadow">
                  ⭐ {t.featured}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="truncate text-base font-semibold text-slate-900">
                  {barber.name}
                </h2>
                {barber.category && (
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium capitalize text-blue-700">
                    {barber.category}
                  </span>
                )}
              </div>

              {barber.address && (
                <p className="line-clamp-2 text-sm text-slate-600">
                  📍 {barber.address}
                </p>
              )}

              {/* ⭐ Distance */}
              {barber.distance && (
                <p className="text-sm font-medium text-blue-600">
                  {barber.distance.toFixed(1)} {t.away}
                </p>
              )}

              {/* Services */}
              <div className="flex flex-wrap gap-2">
                {(barber.services || []).slice(0, 5).map((service) => {
                  const key = service.toLowerCase();
                  const translated =
                    serviceTranslations[key]?.[lang] || service;

                  return (
                    <span
                      key={service}
                      className="rounded-full bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-medium capitalize text-slate-800"
                    >
                      {translated}
                    </span>
                  );
                })}

                {(barber.services || []).length > 5 && (
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
                    +{(barber.services || []).length - 5} {t.more}
                  </span>
                )}
              </div>

              {/* Contact + actions */}
              <div className="mt-2 flex items-center justify-between">
                <div className="space-y-1 text-sm text-slate-600">
                  {barber.phone && (
                    <p className="truncate">
                      📞 <span className="font-medium text-slate-900">{barber.phone}</span>
                    </p>
                  )}
                  {barber.email && (
                    <p className="truncate">
                      ✉️ <span className="font-medium text-slate-900">{barber.email}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {barber.map_url && (
                    <a
                      href={`${barber.map_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow hover:bg-blue-700"
                    >
                      {t.viewMap}
                    </a>
                  )}

                  <a
                    href={`/barbers/${barber.id}?lang=${lang}`}
                    className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow hover:bg-slate-700"
                  >
                    {t.viewProfile}
                  </a>

                  <a
                    href={`/booking/${barber.id}?lang=${lang}`}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-900 hover:border-blue-600"
                  >
                    {t.viewSchedule}
                  </a>
                </div>
              </div>
            </div>
          </article>
        ))}

        {filteredBarbers.length === 0 && (
          <div className="col-span-full rounded-xl bg-white p-6 text-center text-sm text-slate-600">
            {t.noResults}
          </div>
        )}
      </section>
    </div>
  );
}
