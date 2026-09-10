"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import GetUserLocation from "./GetUserLocation";
import { calculateDistance } from "./distance";

type Barber = {
  id: string;
  business_id: string | null;
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

type Business = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  map_url: string | null;
  category: string | null;
  featured: boolean | null;
  photo_url: string | null;
  distance?: number | null;
};

type MarketplaceItem =
  | (Barber & { itemType: "barber" })
  | (Business & {
      itemType: "business";
      email: null;
      services: string[];

    });

const translations = {
  en: {
    searchPlaceholder: "Search by name or address...",
    featured: "Featured",
    noPhoto: "No photo",
    viewMap: "View map",
    viewProfile: "View profile",
    viewSchedule: "View schedule",
    bookBusiness: "Book",
    noResults: "No businesses or barbers found with these filters.",
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
    bookBusiness: "Reservar",
    noResults: "No se encontraron negocios o barberos con estos filtros.",
    more: "más",
    away: "km de distancia",
  },
};

const serviceTranslations: Record<
  string,
  {
    en: string;
    es: string;
  }
> = {
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
  businesses,
  lang,
}: {
  barbers: Barber[];
  businesses: Business[];
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null
  );
  const [selectedService, setSelectedService] = useState<string | null>(
    null
  );
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  // ⭐ GPS location
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // ⭐ Combine barbers + businesses
  const marketplaceItems = useMemo<MarketplaceItem[]>(() => {
    const barberItems: MarketplaceItem[] = barbers.map((barber) => ({
      ...barber,
      itemType: "barber" as const,
    }));

    const businessItems: MarketplaceItem[] = businesses.map((business) => ({
      ...business,
      itemType: "business" as const,
      email: null,
      photo_url: business.photo_url,
      services: [],
    }));

    return [...barberItems, ...businessItems];
  }, [barbers, businesses]);

  // ⭐ Add distance to each marketplace item
  const itemsWithDistance = useMemo(() => {
    if (!userLocation) return marketplaceItems;

    return marketplaceItems.map((item) => {
      if (!item.lat || !item.lng) {
        return {
          ...item,
          distance: null,
        };
      }

      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        item.lat,
        item.lng
      );

      return {
        ...item,
        distance,
      };
    });
  }, [marketplaceItems, userLocation]);

  // ⭐ Sort by nearest
  const sortedItems = useMemo(() => {
    return [...itemsWithDistance].sort((a, b) => {
      if (a.distance === null || a.distance === undefined) return 1;
      if (b.distance === null || b.distance === undefined) return -1;

      return a.distance - b.distance;
    });
  }, [itemsWithDistance]);

  // ⭐ Apply filters AFTER sorting
  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.address || "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesCategory =
        !selectedCategory ||
        (item.itemType === "barber" &&
          item.category === selectedCategory);

      const matchesFeatured =
        !showFeaturedOnly || !!item.featured;

      const matchesService =
        !selectedService ||
        (item.itemType === "barber" &&
          (item.services || []).includes(
            selectedService.toLowerCase()
          ));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesFeatured &&
        matchesService
      );
    });
  }, [
    sortedItems,
    search,
    selectedCategory,
    showFeaturedOnly,
    selectedService,
  ]);

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-4 py-6 max-w-6xl mx-auto">
      {/* ⭐ GPS */}
      <GetUserLocation onLocation={setUserLocation} />

      {/* Language Toggle */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          onClick={() => router.push("/marketplace?lang=en")}
          className={`px-3 py-1 border rounded ${
            lang === "en"
              ? "bg-slate-900 text-white"
              : ""
          }`}
        >
          EN
        </button>

        <button
          onClick={() => router.push("/marketplace?lang=es")}
          className={`px-3 py-1 border rounded ${
            lang === "es"
              ? "bg-slate-900 text-white"
              : ""
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
                setSelectedCategory(
                  selectedCategory === cat ? null : cat
                )
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
              serviceTranslations[service]?.[lang] ||
              service;

            return (
              <button
                key={service}
                onClick={() =>
                  setSelectedService(
                    selectedService === service
                      ? null
                      : service
                  )
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
        {filteredItems.map((item, index) => (
          <article
            key={`${item.itemType}-${item.id}`}
            className="overflow-hidden rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Photo */}
            <div className="relative h-96 w-full">
              {item.photo_url ? (
                <Image
                  src={item.photo_url}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 100vw,
                         (max-width: 1200px) 50vw,
                         33vw"
                  unoptimized
                  loading={
                    index === 0 ? "eager" : "lazy"
                  }
                  className="object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs text-slate-600">
                  {t.noPhoto}
                </div>
              )}

              {item.featured && (
                <span className="absolute left-3 top-3 rounded-full bg-yellow-400 px-2 py-1 text-xs font-semibold text-slate-900 shadow">
                  ⭐ {t.featured}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-center justify-between">
                <h2 className="truncate text-base font-semibold text-slate-900">
                  {item.name}
                </h2>

                {item.category && (
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium capitalize text-blue-700">
                    {item.category}
                  </span>
                )}
              </div>

              {item.address && (
                <p className="line-clamp-2 text-sm text-slate-600">
                  📍 {item.address}
                </p>
              )}

              {/* ⭐ Distance + Navigation */}
              {item.distance &&
                item.lat &&
                item.lng &&
                userLocation && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-blue-600">
                      🧭 {item.distance.toFixed(1)}{" "}
                      {t.away}
                    </span>

                    {/* Google Maps */}
                    <a
                      href={`https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${item.lat},${item.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 underline"
                    >
                      Google Maps
                    </a>

                    {/* Waze */}
                    <a
                      href={`https://waze.com/ul?ll=${item.lat},${item.lng}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 underline"
                    >
                      Waze
                    </a>
                  </div>
                )}

              {/* Barber Services */}
              {item.itemType === "barber" && (
                <div className="flex flex-wrap gap-2">
                  {(item.services || [])
                    .slice(0, 5)
                    .map((service) => {
                      const key = service.toLowerCase();

                      const translated =
                        serviceTranslations[key]?.[lang] ||
                        service;

                      return (
                        <span
                          key={service}
                          className="rounded-full bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-medium capitalize text-slate-800"
                        >
                          {translated}
                        </span>
                      );
                    })}

                  {(item.services || []).length > 5 && (
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">
                      +
                      {(item.services || []).length - 5}{" "}
                      {t.more}
                    </span>
                  )}
                </div>
              )}

              {/* Contact + actions */}
              <div className="mt-2 flex items-center justify-between">
                <div className="space-y-1 text-sm text-slate-600">
                  {item.phone && (
                    <p className="truncate">
                      📞{" "}
                      <span className="font-medium text-slate-900">
                        {item.phone}
                      </span>
                    </p>
                  )}

                  {item.email && (
                    <p className="truncate">
                      ✉️{" "}
                      <span className="font-medium text-slate-900">
                        {item.email}
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  {item.map_url && (
                    <a
                      href={item.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow hover:bg-blue-700"
                    >
                      {t.viewMap}
                    </a>
                  )}

                  {item.itemType === "barber" ? (
                    <>
                      <a
                        href={`/barbers/${item.id}?lang=${lang}`}
                        className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow hover:bg-slate-700"
                      >
                        {t.viewProfile}
                      </a>

                      <a
                        href={`/booking/${item.id}?lang=${lang}`}
                        className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-900 hover:border-blue-600"
                      >
                        {t.viewSchedule}
                      </a>
                    </>
                  ) : (
                    <a
                      href={`/business/${item.id}/booking?lang=${lang}`}
                      className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow hover:bg-slate-700"
                    >
                      {t.bookBusiness}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full rounded-xl bg-white p-6 text-center text-sm text-slate-600">
            {t.noResults}
          </div>
        )}
      </section>
    </div>
  );
}