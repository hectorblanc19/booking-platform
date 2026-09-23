"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BusinessProfilePage() {
  const { businessId } = useParams();
  const router = useRouter();

  const [business, setBusiness] = useState(null);
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [lang, setLang] = useState("es");

  useEffect(() => {
    if (!businessId) return;

    loadPreview();
  }, [businessId]);

  async function loadPreview() {
    setLoading(true);
    setAuthorized(false);
    setAuthMessage("");

    try {
      // ==================================================
      // 1. LOAD PUBLISHED PROFILE
      // Public RLS only allows published profiles to load.
      // ==================================================
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("business_profile_settings")
        .select("*")
        .eq("business_id", businessId)
        .eq("published", true)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Public profile load error:",
          profileError
        );
      }

      if (!profileData) {
        setAuthMessage(
          lang === "es"
            ? "Esta página todavía no está publicada."
            : "This page has not been published yet."
        );
        return;
      }

      setProfile(profileData);

      // ==================================================
      // 2. LOAD BUSINESS
      // ==================================================
      const {
        data: businessData,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .single();

      if (businessError || !businessData) {
        console.error(
          "Public business load error:",
          businessError
        );

        setAuthMessage(
          lang === "es"
            ? "No se pudo cargar este negocio."
            : "This business could not be loaded."
        );
        return;
      }

      setBusiness(businessData);

      // ==================================================
      // 3. SERVICES
      // ==================================================
      const {
        data: serviceData,
        error: serviceError,
      } = await supabase
        .from("business_services")
        .select(
          `
            id,
            name,
            name_en,
            description,
            description_en,
            price,
            duration,
            provider_id,
            is_active
          `
        )
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (serviceError) {
        console.error(
          "Public services load error:",
          serviceError
        );
      }

      setServices(serviceData || []);

      // ==================================================
      // 4. PROVIDERS
      // ==================================================
      const {
        data: providerData,
        error: providerError,
      } = await supabase
        .from("providers")
        .select(
          `
            id,
            name,
            specialty,
            photo_url
          `
        )
        .eq("business_id", businessId)
        .order("name", { ascending: true });

      if (providerError) {
        console.error(
          "Public providers load error:",
          providerError
        );
      }

      setProviders(providerData || []);

      // ==================================================
      // 5. GALLERY
      // Public RLS only exposes gallery images when the
      // matching business profile is published.
      // ==================================================
      const {
        data: galleryData,
        error: galleryError,
      } = await supabase
        .from("business_gallery")
        .select(
          `
            id,
            image_url,
            sort_order
          `
        )
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true });

      if (galleryError) {
        console.error(
          "Public gallery load error:",
          galleryError
        );
      }

      setGallery(galleryData || []);

      // ==================================================
      // 6. BUSINESS / STORE HOURS
      // These are separate from each professional's hours.
      // ==================================================
      const {
        data: businessHoursData,
        error: businessHoursError,
      } = await supabase
        .from("business_hours")
        .select("day_of_week, open_time, close_time, is_open")
        .eq("business_id", businessId)
        .order("day_of_week", { ascending: true });

      if (businessHoursError) {
        console.error(
          "Public business hours load error:",
          businessHoursError
        );
      }

      setBusinessHours(businessHoursData || []);

      // ==================================================
      // 7. VERIFIED CUSTOMER REVIEWS
      // Reviews are tied to real FlowPayDR appointments.
      // ==================================================
      const {
        data: ratingData,
        error: ratingError,
      } = await supabase
        .from("ratings")
        .select(
          `
            id,
            rating,
            review_text,
            created_at,
            appointment_id,
            appointments (
              customer_name,
              service,
              date
            )
          `
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (ratingError) {
        console.error(
          "Public reviews load error:",
          ratingError
        );
      }

      setReviews(ratingData || []);
      setAuthorized(true);
    } catch (error) {
      console.error("Public profile load error:", error);

      setAuthMessage(
        lang === "es"
          ? "Ocurrió un error cargando esta página."
          : "An error occurred while loading this page."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // LOADING
  // ==================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />

          <p className="text-gray-500 mt-4">
            {lang === "es"
              ? "Cargando vista previa..."
              : "Loading preview..."}
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // PAGE NOT AVAILABLE
  // ==================================================
  if (!authorized || !business || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white border rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🏢</div>

          <h1 className="text-xl font-bold text-gray-900">
            {lang === "es"
              ? "Página no disponible"
              : "Page unavailable"}
          </h1>

          <p className="text-gray-500 mt-3 text-sm leading-6">
            {authMessage ||
              (lang === "es"
                ? "Esta página de negocio no está disponible en este momento."
                : "This business page is not available right now.")}
          </p>

          <button
            type="button"
            onClick={() =>
              setLang((current) =>
                current === "es" ? "en" : "es"
              )
            }
            className="mt-6 border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50"
          >
            {lang === "es" ? "EN" : "ES"}
          </button>
        </div>
      </div>
    );
  }

  // ==================================================
  // PROFILE DISPLAY SETTINGS
  // ==================================================
  const brandColor =
    profile?.brand_color || "#2563EB";

  const theme = profile?.theme || "modern";

  const themeStyles = getThemeStyles(theme);

  const coverImage =
    profile?.cover_url ||
    business?.photo_url ||
    "/default-business.png";

  const logoImage =
    profile?.logo_url ||
    business?.photo_url ||
    null;

  // ==================================================
  // GROUP DUPLICATE SERVICES FOR PUBLIC DISPLAY
  // Keep provider-specific service rows in the database,
  // but show one clean card when multiple professionals
  // offer the same service.
  // ==================================================
  const groupedServices = Object.values(
    services.reduce((groups, service) => {
      const key = [
        (service.name || "").trim().toLowerCase(),
        (service.description || "").trim().toLowerCase(),
        service.price ?? "",
        service.duration ?? "",
      ].join("|");

      if (!groups[key]) {
        groups[key] = {
          ...service,
          providerIds: [],
        };
      }

      if (
        service.provider_id &&
        !groups[key].providerIds.includes(service.provider_id)
      ) {
        groups[key].providerIds.push(service.provider_id);
      }

      return groups;
    }, {})
  ).map((service) => ({
    ...service,
    providerNames: service.providerIds
      .map(
        (providerId) =>
          providers.find(
            (provider) => provider.id === providerId
          )?.name
      )
      .filter(Boolean),
  }));

  // ==================================================
  // CUSTOM SECTION ORDER
  // Hero stays fixed at the top. Final CTA and footer stay fixed below.
  // Existing profiles fall back to the original FlowPayDR order.
  // ==================================================
  const DEFAULT_SECTION_ORDER = [
    "about",
    "services",
    "team",
    "gallery",
    "reviews",
    "policies",
    "location",
  ];

  const allowedSectionKeys = new Set(DEFAULT_SECTION_ORDER);

  const savedSectionOrder = Array.isArray(profile?.section_order)
    ? profile.section_order.filter((key) => allowedSectionKeys.has(key))
    : [];

  const sectionOrder = [
    ...savedSectionOrder,
    ...DEFAULT_SECTION_ORDER.filter(
      (key) => !savedSectionOrder.includes(key)
    ),
  ];

  function renderSection(sectionKey) {
    switch (sectionKey) {
      case "about":
        return (
          <div key="about">
            {(profile?.about || profile?.about_en) && (
              <section className="max-w-5xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
                <SectionLabel
                  text={
                    lang === "es"
                      ? "Sobre nosotros"
                      : "About us"
                  }
                  brandColor={brandColor}
                />
            
                <h2
                  className={`text-3xl sm:text-4xl text-gray-900 mb-6 ${themeStyles.heading}`}
                >
                  {lang === "es"
                    ? "Conoce nuestro negocio"
                    : "Get to know our business"}
                </h2>
            
                <p className="text-gray-600 text-base sm:text-lg leading-8 whitespace-pre-line max-w-3xl">
                  {lang === "en" && profile.about_en?.trim()
                    ? profile.about_en
                    : profile.about}
                </p>
              </section>
            )}
          </div>
        );
      case "services":
        return (
          <div key="services">
            {profile?.show_services && (
              <section className={themeStyles.altSection}>
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
                  <SectionLabel
                    text={
                      lang === "es"
                        ? "Nuestros servicios"
                        : "Our services"
                    }
                    brandColor={brandColor}
                  />
            
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                    <h2
                      className={`text-3xl sm:text-4xl text-gray-900 ${themeStyles.heading}`}
                    >
                      {lang === "es"
                        ? "Elige el servicio ideal para ti"
                        : "Choose the right service for you"}
                    </h2>
            
                    <span className="text-sm text-gray-500">
                      {groupedServices.length}{" "}
                      {groupedServices.length === 1
                        ? lang === "es"
                          ? "servicio"
                          : "service"
                        : lang === "es"
                        ? "servicios"
                        : "services"}
                    </span>
                  </div>
            
                  {groupedServices.length === 0 ? (
                    <EmptyState
                      text={
                        lang === "es"
                          ? "Todavía no hay servicios disponibles."
                          : "There are no services available yet."
                      }
                    />
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {groupedServices.map((service) => (
                        <article
                          key={service.id}
                          className={`bg-white border border-gray-100 p-6 ${themeStyles.card}`}
                        >
                          <div
                            className="w-10 h-1 rounded-full mb-5"
                            style={{
                              backgroundColor: brandColor,
                            }}
                          />
            
                          <h3
                            className={`text-xl text-gray-900 ${themeStyles.cardTitle}`}
                          >
                            {lang === "en" && service.name_en?.trim()
                              ? service.name_en
                              : service.name}
                          </h3>
            
                          {(service.description ||
                            service.description_en) && (
                            <p className="text-sm text-gray-500 leading-6 mt-3">
                              {lang === "en" &&
                              service.description_en?.trim()
                                ? service.description_en
                                : service.description}
                            </p>
                          )}
            
                          <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between gap-4">
                            <div>
                              {service.price !== null &&
                                service.price !==
                                  undefined && (
                                  <div className="font-bold text-lg text-gray-900">
                                    RD${" "}
                                    {formatPrice(
                                      service.price
                                    )}
                                  </div>
                                )}
            
                              {service.duration && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {service.duration}{" "}
                                  {lang === "es"
                                    ? "minutos"
                                    : "minutes"}
                                </div>
                              )}
            
                              {service.providerNames.length > 0 && (
                                <div className="text-xs text-gray-500 mt-2">
                                  <span className="font-semibold">
                                    {lang === "es"
                                      ? "Disponible con: "
                                      : "Available with: "}
                                  </span>
                                  {service.providerNames.join(", ")}
                                </div>
                              )}
                            </div>
            
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/business/${businessId}/booking`
                                )
                              }
                              className={`px-4 py-2 text-sm font-semibold ${themeStyles.smallButton}`}
                              style={{
                                backgroundColor:
                                  `${brandColor}18`,
                                color: brandColor,
                              }}
                            >
                              {lang === "es"
                                ? "Reservar"
                                : "Book"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        );
      case "team":
        return (
          <div key="team">
            {profile?.show_team && (
              <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
                <SectionLabel
                  text={
                    lang === "es"
                      ? "Nuestro equipo"
                      : "Our team"
                  }
                  brandColor={brandColor}
                />
            
                <h2
                  className={`text-3xl sm:text-4xl text-gray-900 mb-9 ${themeStyles.heading}`}
                >
                  {lang === "es"
                    ? "Profesionales que te atenderán"
                    : "Professionals ready to serve you"}
                </h2>
            
                {providers.length === 0 ? (
                  <EmptyState
                    text={
                      lang === "es"
                        ? "Todavía no hay profesionales registrados."
                        : "There are no professionals listed yet."
                    }
                  />
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {providers.map((provider) => (
                      <article
                        key={provider.id}
                        className={`bg-white overflow-hidden border border-gray-100 ${themeStyles.card}`}
                      >
                        <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                          {provider.photo_url ? (
                            <img
                              src={provider.photo_url}
                              alt={provider.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">
                              👤
                            </div>
                          )}
                        </div>
            
                        <div className="p-6">
                          <h3
                            className={`text-xl text-gray-900 ${themeStyles.cardTitle}`}
                          >
                            {provider.name}
                          </h3>
            
                          {provider.specialty && (
                            <p
                              className="text-sm font-semibold mt-1"
                              style={{
                                color: brandColor,
                              }}
                            >
                              {provider.specialty}
                            </p>
                          )}
            
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/business/${businessId}/booking?provider=${provider.id}&start=true`
                              )
                            }
                            className={`mt-5 w-full py-3 font-semibold ${themeStyles.button}`}
                            style={{
                              backgroundColor:
                                brandColor,
                              color:
                                getContrastColor(
                                  brandColor
                                ),
                            }}
                          >
                            {lang === "es"
                              ? `Reservar con ${provider.name}`
                              : `Book with ${provider.name}`}
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        );
      case "gallery":
        return (
          <div key="gallery">
            {profile?.show_gallery &&
              gallery.length > 0 && (
                <section className={themeStyles.altSection}>
                  <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
                    <SectionLabel
                      text={
                        lang === "es"
                          ? "Galería"
                          : "Gallery"
                      }
                      brandColor={brandColor}
                    />
            
                    <h2
                      className={`text-3xl sm:text-4xl text-gray-900 mb-9 ${themeStyles.heading}`}
                    >
                      {lang === "es"
                        ? "Conoce nuestro trabajo"
                        : "See our work"}
                    </h2>
            
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                      {gallery.map(
                        (image, index) => (
                          <div
                            key={image.id}
                            className={`overflow-hidden bg-gray-100 ${themeStyles.galleryImage} ${
                              index === 0 &&
                              gallery.length >= 3
                                ? "md:col-span-2 md:row-span-2"
                                : ""
                            }`}
                          >
                            <img
                              src={image.image_url}
                              alt={`${business.name} gallery ${
                                index + 1
                              }`}
                              className="w-full h-full object-cover hover:scale-105 transition duration-500"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </section>
              )}
          </div>
        );
      case "reviews":
        return (
          <div key="reviews">
            {reviews.length > 0 && (
              <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
                <SectionLabel
                  text={
                    lang === "es"
                      ? "Lo que dicen nuestros clientes"
                      : "What our customers say"
                  }
                  brandColor={brandColor}
                />
            
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-9">
                  <div>
                    <h2
                      className={`text-3xl sm:text-4xl text-gray-900 ${themeStyles.heading}`}
                    >
                      {lang === "es"
                        ? "Opiniones de clientes"
                        : "Customer reviews"}
                    </h2>
            
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span className="text-yellow-400 text-lg tracking-tight">
                        {renderStars(getAverageRating(reviews))}
                      </span>
                      <span className="font-bold text-gray-900">
                        {getAverageRating(reviews).toFixed(1)}
                      </span>
                      <span>·</span>
                      <span>
                        {reviews.length}{" "}
                        {reviews.length === 1
                          ? lang === "es"
                            ? "reseña"
                            : "review"
                          : lang === "es"
                          ? "reseñas"
                          : "reviews"}
                      </span>
                    </div>
                  </div>
                </div>
            
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {reviews.map((review) => {
                    const appointment = Array.isArray(review.appointments)
                      ? review.appointments[0]
                      : review.appointments;
            
                    const customerName =
                      appointment?.customer_name?.trim() ||
                      (lang === "es" ? "Cliente" : "Customer");
            
                    return (
                      <article
                        key={review.id}
                        className={`bg-white border border-gray-100 p-6 ${themeStyles.card}`}
                      >
                        <div
                          className="text-yellow-400 text-lg tracking-tight"
                          aria-label={`${review.rating} / 5`}
                        >
                          {renderStars(review.rating)}
                        </div>
            
                        {review.review_text?.trim() && (
                          <p className="mt-4 text-gray-700 leading-7">
                            “{review.review_text.trim()}”
                          </p>
                        )}
            
                        <div className="mt-6 pt-5 border-t border-gray-100">
                          <p className="font-bold text-gray-900">
                            {customerName}
                          </p>
            
                          <p
                            className="mt-1 text-xs font-semibold"
                            style={{ color: brandColor }}
                          >
                            ✓ {lang === "es"
                              ? "Cliente verificado"
                              : "Verified customer"}
                          </p>
            
                          {appointment?.service && (
                            <p className="mt-2 text-xs text-gray-500">
                              {appointment.service}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        );
      case "policies": {
        const policyItems = [
          {
            key: "cancellation",
            title:
              lang === "es"
                ? "Cancelaciones"
                : "Cancellations",
            text:
              lang === "en" && profile?.cancellation_policy_en?.trim()
                ? profile.cancellation_policy_en.trim()
                : profile?.cancellation_policy?.trim(),
          },
          {
            key: "late",
            title:
              lang === "es"
                ? "Llegadas tarde"
                : "Late arrivals",
            text:
              lang === "en" && profile?.late_policy_en?.trim()
                ? profile.late_policy_en.trim()
                : profile?.late_policy?.trim(),
          },
          {
            key: "payment",
            title:
              lang === "es"
                ? "Pagos y depósitos"
                : "Payments and deposits",
            text:
              lang === "en" && profile?.payment_policy_en?.trim()
                ? profile.payment_policy_en.trim()
                : profile?.payment_policy?.trim(),
          },
          {
            key: "general",
            title:
              lang === "es"
                ? "Reglas generales"
                : "General rules",
            text:
              lang === "en" && profile?.general_policy_en?.trim()
                ? profile.general_policy_en.trim()
                : profile?.general_policy?.trim(),
          },
        ].filter((item) => item.text);

        return (
          <div key="policies">
            {profile?.show_policies && policyItems.length > 0 && (
              <section className={themeStyles.altSection}>
                <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
                  <SectionLabel
                    text={
                      lang === "es"
                        ? "Información importante"
                        : "Important information"
                    }
                    brandColor={brandColor}
                  />

                  <h2
                    className={`text-3xl sm:text-4xl text-gray-900 mb-3 ${themeStyles.heading}`}
                  >
                    {lang === "es"
                      ? "Políticas del negocio"
                      : "Business policies"}
                  </h2>

                  <p className="text-gray-500 leading-7 mb-9 max-w-3xl">
                    {lang === "es"
                      ? "Consulta la información importante antes de reservar tu cita."
                      : "Review this important information before booking your appointment."}
                  </p>

                  <div className="grid md:grid-cols-2 gap-5">
                    {policyItems.map((item) => (
                      <article
                        key={item.key}
                        className={`bg-white border border-gray-100 p-6 ${themeStyles.card}`}
                      >
                        <div
                          className="w-10 h-1 rounded-full mb-5"
                          style={{ backgroundColor: brandColor }}
                        />

                        <h3
                          className={`text-xl text-gray-900 ${themeStyles.cardTitle}`}
                        >
                          {item.title}
                        </h3>

                        <p className="mt-3 text-gray-600 leading-7 whitespace-pre-line">
                          {item.text}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        );
      }

      case "location":
        return (
          <div key="location">
            {profile?.show_location && (
              <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
                <SectionLabel
                  text={
                    lang === "es"
                      ? "Visítanos"
                      : "Visit us"
                  }
                  brandColor={brandColor}
                />
            
                <h2
                  className={`text-3xl sm:text-4xl text-gray-900 mb-8 ${themeStyles.heading}`}
                >
                  {lang === "es"
                    ? "Ubicación"
                    : "Location"}
                </h2>
            
                <div
                  className={`bg-white border border-gray-100 overflow-hidden ${themeStyles.card}`}
                >
                  {business.address && (
                    <iframe
                      title="Business location"
                      className="w-full h-72 sm:h-96 border-0"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(
                        business.address
                      )}&z=15&output=embed`}
                      loading="lazy"
                    />
                  )}
            
                  <div className="p-6 sm:p-8 grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                        {lang === "es"
                          ? "Dirección"
                          : "Address"}
                      </p>
            
                      <p className="font-semibold text-gray-900 mt-2">
                        {business.address ||
                          (lang === "es"
                            ? "Dirección no disponible"
                            : "Address unavailable")}
                      </p>
                    </div>
            
                    {business.phone && (
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
                          {lang === "es"
                            ? "Teléfono"
                            : "Phone"}
                        </p>
            
                        <p className="font-semibold text-gray-900 mt-2">
                          {business.phone}
                        </p>
                      </div>
                    )}
            
                    {businessHours.length > 0 && (
                      <div className="md:col-span-2 pt-6 border-t border-gray-100">
                        <BusinessHoursStatus
                          hours={businessHours}
                          lang={lang}
                          brandColor={brandColor}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        );
      default:
        return null;
    }
  }

  // ==================================================
  // PAGE
  // ==================================================
  return (
    <div
      className={`min-h-screen ${themeStyles.page}`}
    >
      {/* ============================================= */}
      {/* BUSINESS PAGE */}
      {/* ============================================= */}
      <main>
        {/* HERO */}
        <section className="relative">
          <div className="relative h-[360px] sm:h-[440px] lg:h-[520px] overflow-hidden bg-gray-900">
            {/* PUBLIC LANGUAGE SWITCHER */}
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30">
              <div className="flex items-center rounded-full bg-black/55 backdrop-blur-sm border border-white/25 p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => setLang("es")}
                  aria-pressed={lang === "es"}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition ${
                    lang === "es"
                      ? "bg-white text-gray-950"
                      : "text-white hover:bg-white/15"
                  }`}
                >
                  ES
                </button>

                <button
                  type="button"
                  onClick={() => setLang("en")}
                  aria-pressed={lang === "en"}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition ${
                    lang === "en"
                      ? "bg-white text-gray-950"
                      : "text-white hover:bg-white/15"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            <img
              src={coverImage}
              alt={business.name}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* Softer horizontal overlay.
                Darker behind the text on the left,
                much lighter over the business photo on the right. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.28) 42%, rgba(0,0,0,0.06) 75%, rgba(0,0,0,0.02) 100%)",
              }}
            />

            {/* Small bottom gradient for depth */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.22) 0%, transparent 45%)",
              }}
            />

            <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 h-full flex items-end pb-10 sm:pb-14">
              <div className="max-w-3xl text-white">
                {logoImage && (
                  <div
                    className={`mb-5 bg-white overflow-hidden flex items-center justify-center shadow-xl ${themeStyles.logo}`}
                  >
                    <img
                      src={logoImage}
                      alt={`${business.name} logo`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <p
                  className="text-sm font-semibold uppercase tracking-[0.22em] mb-3"
                  style={{ color: brandColor }}
                >
                  {business.category ||
                    (lang === "es"
                      ? "Negocio"
                      : "Business")}
                </p>

                <h1
                  className={`text-4xl sm:text-6xl leading-tight ${themeStyles.heroTitle}`}
                >
                  {business.name}
                </h1>

                {business.address && (
                  <p className="mt-4 text-white/90 text-sm sm:text-base">
                    📍 {business.address}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/business/${businessId}/booking`
                    )
                  }
                  className={`mt-7 px-7 py-3.5 font-bold shadow-lg transition hover:scale-[1.02] ${themeStyles.button}`}
                  style={{
                    backgroundColor: brandColor,
                    color:
                      getContrastColor(brandColor),
                  }}
                >
                  {lang === "es"
                    ? "Reservar una cita"
                    : "Book an appointment"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CUSTOMIZABLE CONTENT SECTIONS */}
        {sectionOrder.map((sectionKey) =>
          renderSection(sectionKey)
        )}

        {/* FINAL CTA */}
        <section
          className="px-5 sm:px-8 py-16 sm:py-20"
          style={{
            backgroundColor: brandColor,
          }}
        >
          <div className="max-w-4xl mx-auto text-center">
            <h2
              className={`text-3xl sm:text-5xl ${themeStyles.heroTitle}`}
              style={{
                color:
                  getContrastColor(brandColor),
              }}
            >
              {lang === "es"
                ? "¿Listo para reservar?"
                : "Ready to book?"}
            </h2>

            <p
              className="mt-4 opacity-80"
              style={{
                color:
                  getContrastColor(brandColor),
              }}
            >
              {lang === "es"
                ? `Reserva tu próxima cita con ${business.name}.`
                : `Book your next appointment with ${business.name}.`}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/business/${businessId}/booking`
                )
              }
              className="mt-7 bg-white text-gray-950 px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition"
            >
              {lang === "es"
                ? "Reservar ahora"
                : "Book now"}
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-400">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-sm">
          <div>
            <span className="text-white font-semibold">
              {business.name}
            </span>

            <span className="mx-2">·</span>

            <span>
              {lang === "es"
                ? "Reservas online"
                : "Online booking"}
            </span>
          </div>

          <div>
            {lang === "es"
              ? "Reservas con"
              : "Booking by"}{" "}
            <span className="text-white font-semibold">
              FlowPayDR
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function getAverageRating(reviews) {
  if (!reviews?.length) return 0;

  const total = reviews.reduce(
    (sum, review) => sum + Number(review.rating || 0),
    0
  );

  return total / reviews.length;
}

function renderStars(value) {
  const rating = Math.round(Number(value) || 0);

  return [1, 2, 3, 4, 5]
    .map((star) => (star <= rating ? "★" : "☆"))
    .join("");
}

function BusinessHoursStatus({ hours, lang, brandColor }) {
  const now = getDominicanDateParts();
  const today = hours.find((item) => Number(item.day_of_week) === now.dayOfWeek);
  const tomorrowDay = (now.dayOfWeek + 1) % 7;
  const tomorrow = hours.find((item) => Number(item.day_of_week) === tomorrowDay);

  const isOpenNow = isBusinessOpenNow(today, now.minutes);

  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
        {lang === "es" ? "Horario del negocio" : "Business hours"}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isOpenNow ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span
          className="font-bold"
          style={{ color: isOpenNow ? brandColor : "#DC2626" }}
        >
          {isOpenNow
            ? lang === "es"
              ? "Abierto ahora"
              : "Open now"
            : lang === "es"
            ? "Cerrado ahora"
            : "Closed now"}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-sm text-gray-600">
        <p>
          <span className="font-semibold text-gray-800">
            {lang === "es" ? "Horario de hoy:" : "Today's hours:"}
          </span>{" "}
          {formatBusinessHours(today, lang)}
        </p>

        <p>
          <span className="font-semibold text-gray-800">
            {lang === "es" ? "Mañana:" : "Tomorrow:"}
          </span>{" "}
          {formatBusinessHours(tomorrow, lang)}
        </p>
      </div>
    </div>
  );
}

function getDominicanDateParts() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0) % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);

  const dayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dayOfWeek: dayMap[weekday] ?? 0,
    minutes: hour * 60 + minute,
  };
}

function isBusinessOpenNow(day, currentMinutes) {
  if (!day?.is_open || !day.open_time || !day.close_time) {
    return false;
  }

  const openMinutes = timeToMinutes(day.open_time);
  const closeMinutes = timeToMinutes(day.close_time);

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function formatBusinessHours(day, lang) {
  if (!day || !day.is_open || !day.open_time || !day.close_time) {
    return lang === "es" ? "Cerrado" : "Closed";
  }

  return `${formatBusinessTime(day.open_time)} – ${formatBusinessTime(
    day.close_time
  )}`;
}

function formatBusinessTime(time) {
  if (!time) return "";

  const [hourString, minute = "00"] = time.slice(0, 5).split(":");
  let hour = Number(hourString);
  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${period}`;
}

function timeToMinutes(time) {
  if (!time) return 0;

  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function SectionLabel({ text, brandColor }) {
  return (
    <div
      className="text-xs font-bold uppercase tracking-[0.2em] mb-3"
      style={{ color: brandColor }}
    >
      {text}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-500 bg-white">
      {text}
    </div>
  );
}

function formatPrice(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return number.toLocaleString("es-DO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getContrastColor(hex) {
  if (!hex) return "#FFFFFF";

  let cleanHex = hex.replace("#", "");

  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (cleanHex.length !== 6) {
    return "#FFFFFF";
  }

  const r = parseInt(
    cleanHex.substring(0, 2),
    16
  );

  const g = parseInt(
    cleanHex.substring(2, 4),
    16
  );

  const b = parseInt(
    cleanHex.substring(4, 6),
    16
  );

  const brightness =
    (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 160
    ? "#111827"
    : "#FFFFFF";
}

function getThemeStyles(theme) {
  switch (theme) {
    case "elegant":
      return {
        page: "bg-[#FAF8F5]",
        altSection: "bg-[#F4F0EA]",
        heading: "font-serif font-semibold",
        heroTitle: "font-serif font-semibold",
        cardTitle: "font-serif font-semibold",
        card: "rounded-3xl shadow-sm",
        button: "rounded-full",
        smallButton: "rounded-full",
        logo: "w-24 h-24 rounded-full",
        galleryImage:
          "rounded-3xl aspect-square",
      };

    case "minimal":
      return {
        page: "bg-white",
        altSection: "bg-gray-50",
        heading:
          "font-light tracking-tight",
        heroTitle:
          "font-light tracking-tight",
        cardTitle: "font-medium",
        card: "rounded-none shadow-none",
        button: "rounded-none",
        smallButton: "rounded-none",
        logo: "w-24 h-24 rounded-none",
        galleryImage:
          "rounded-none aspect-square",
      };

    case "vibrant":
      return {
        page: "bg-white",
        altSection: "bg-gray-50",
        heading:
          "font-black tracking-tight",
        heroTitle:
          "font-black tracking-tight",
        cardTitle: "font-black",
        card: "rounded-3xl shadow-lg",
        button: "rounded-2xl",
        smallButton: "rounded-xl",
        logo: "w-24 h-24 rounded-3xl",
        galleryImage:
          "rounded-3xl aspect-square",
      };

    case "modern":
    default:
      return {
        page: "bg-white",
        altSection: "bg-gray-50",
        heading: "font-bold tracking-tight",
        heroTitle:
          "font-bold tracking-tight",
        cardTitle: "font-bold",
        card: "rounded-2xl shadow-sm",
        button: "rounded-xl",
        smallButton: "rounded-lg",
        logo: "w-24 h-24 rounded-2xl",
        galleryImage:
          "rounded-2xl aspect-square",
      };
  }
}