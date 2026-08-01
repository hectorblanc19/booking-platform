import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import ReviewsClient from "./ReviewsClient";

const translations = {
  en: {
    business: "Business",
    featured: "Featured",
    availability: "Availability",
    services: "Services",
    gallery: "Photo Gallery",
    ratings: "Ratings & Reviews",
    noReviews: "No reviews yet. Be the first!",
    bookNow: "Book Now",
    viewSchedule: "View full schedule",
    phone: "Phone",
    email: "Email",
    map: "View map",
    noPhoto: "No photo",
  },
  es: {
    business: "Negocio",
    featured: "Destacado",
    availability: "Disponibilidad",
    services: "Servicios",
    gallery: "Galería de Fotos",
    ratings: "Calificaciones y Reseñas",
    noReviews: "Aún no hay reseñas. ¡Sé el primero!",
    bookNow: "Reservar",
    viewSchedule: "Ver horario completo",
    phone: "Teléfono",
    email: "Correo",
    map: "Ver mapa",
    noPhoto: "Sin foto",
  }
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

export default async function BarberProfilePage({ params, searchParams }) {
  const p = await params;
  const { id } = p;

  const sp = await searchParams;
  const lang = sp?.lang === "es" ? "es" : "en";
  const t = translations[lang];

  const supabase = createClient();

  const { data: barber } = await supabase
    .from("barbers")
    .select("*")
    .eq("id", id)
    .single();

  if (!barber) {
    return (
      <div className="p-6 text-center text-slate-600">
        Barber not found.
      </div>
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", barber.business_id)
    .single();

  const { data: gallery } = await supabase
    .from("barber_photos")
    .select("*")
    .eq("barber_id", id);

  const { data: slots } = await supabase
    .from("availability")
    .select("*")
    .eq("barber_id", id)
    .order("date", { ascending: true });

  const { data: reviews } = await supabase
    .from("ratings")
    .select("*")
    .eq("barber_id", id)
    .order("created_at", { ascending: false });

  const averageRating =
    reviews?.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* Language Toggle */}
      <div className="flex justify-end mb-4 gap-2">
        <a
          href={`/barbers/${id}?lang=en`}
          className={`px-3 py-1 border rounded ${lang === "en" ? "bg-slate-900 text-white" : ""}`}
        >
          EN
        </a>

        <a
          href={`/barbers/${id}?lang=es`}
          className={`px-3 py-1 border rounded ${lang === "es" ? "bg-slate-900 text-white" : ""}`}
        >
          ES
        </a>
      </div>

      {/* Banner */}
      <div className="relative h-80 w-full rounded-xl overflow-hidden shadow-sm">
        {barber.photo_url ? (
          <Image
            src={barber.photo_url}
            alt={barber.name}
            fill
            sizes="100vw"
            unoptimized
            loading="eager"
            className="object-cover object-center"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200 text-slate-600">
            {t.noPhoto}
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{barber.name}</h1>

          {barber.category && (
            <p className="text-sm text-blue-700 capitalize">{barber.category}</p>
          )}

          {business && (
            <p className="mt-2 text-sm text-slate-700">
              {t.business}: <span className="font-medium">{business.name}</span>
            </p>
          )}

          {business?.address && (
            <p className="text-sm text-slate-700">📍 {business.address}</p>
          )}
        </div>

        {barber.featured && (
          <span className="rounded-full bg-yellow-400 px-3 py-1 text-sm font-semibold text-slate-900 shadow">
            ⭐ {t.featured}
          </span>
        )}
      </div>

      {/* Contact */}
      <div className="mt-3 space-y-1 text-sm text-slate-700">
        {barber.phone && <p>📞 {t.phone}: {barber.phone}</p>}
        {barber.email && <p>✉️ {t.email}: {barber.email}</p>}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        {(barber.map_url || business?.map_url) && (
          <a
            href={(barber.map_url || business.map_url) + `?lang=${lang}`}
            target="_blank"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700"
          >
            {t.map}
          </a>
        )}

        <a
          href={`/booking/${barber.id}?lang=${lang}`}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-700"
        >
          {t.bookNow}
        </a>
      </div>

      {/* Availability */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">{t.availability}</h2>

        {slots?.length > 0 && (
          <div className="mt-4 space-y-2">
            {slots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2"
              >
                <span className="text-sm text-slate-800">
                  {new Date(slot.date).toLocaleDateString()} — {slot.start_time}
                </span>

                <a
                  href={`/booking/${barber.id}?slot=${slot.id}&lang=${lang}`}
                  className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  {t.bookNow}
                </a>
              </div>
            ))}
          </div>
        )}

        <a
          href={`/booking/${barber.id}?lang=${lang}`}
          className="mt-4 inline-block rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:border-blue-600"
        >
          {t.viewSchedule}
        </a>
      </div>

      {/* Services */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">{t.services}</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {(barber.services || []).map((service) => {
            const key = service.toLowerCase();
            const translated =
              serviceTranslations[key]?.[lang] || service;

            return (
              <span
                key={service}
                className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-sm font-medium capitalize text-slate-800"
              >
                {translated}
              </span>
            );
          })}
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">{t.gallery}</h2>

        {gallery?.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.map((photo) => (
              <div
                key={photo.id}
                className="relative h-40 w-full rounded-lg overflow-hidden shadow-sm"
              >
                <Image
                  src={photo.url}
                  alt="Barber work"
                  fill
                  sizes="50vw"
                  unoptimized
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">{t.noPhoto}</p>
        )}
      </div>

      {/* ⭐ ReviewsClient */}
      <ReviewsClient
        reviews={reviews || []}
        averageRating={averageRating}
        lang={lang}
      />

    </div>
  );
}
