"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BusinessProfilePreviewPage() {
  const { businessId } = useParams();
  const router = useRouter();

  const [business, setBusiness] = useState(null);
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [providers, setProviders] = useState([]);
  const [gallery, setGallery] = useState([]);

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
      // 1. GET LOGGED-IN USER
      // ==================================================
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Preview auth error:", userError);

        setAuthMessage(
          lang === "es"
            ? "No se pudo verificar tu sesión."
            : "Your session could not be verified."
        );

        return;
      }

      if (!user) {
        console.error("Preview: no logged-in user found.");

        setAuthMessage(
          lang === "es"
            ? "No hay una sesión activa. Entra nuevamente al panel del negocio."
            : "There is no active session. Sign in to the business dashboard again."
        );

        return;
      }

      console.log("Preview logged-in user:", user.id);

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
          "Preview business load error:",
          businessError
        );

        setAuthMessage(
          lang === "es"
            ? "No se pudo cargar este negocio."
            : "This business could not be loaded."
        );

        return;
      }

      console.log(
        "Preview business owner:",
        businessData.owner_id
      );

      // ==================================================
      // 3. VERIFY OWNER
      // ==================================================
      if (businessData.owner_id !== user.id) {
        console.error("Preview owner check failed:", {
          loggedInUser: user.id,
          businessOwner: businessData.owner_id,
          businessId,
        });

        setAuthMessage(
          lang === "es"
            ? "La sesión actual no corresponde al propietario de este negocio."
            : "The current session does not belong to the owner of this business."
        );

        return;
      }

      setBusiness(businessData);
      setAuthorized(true);

      // ==================================================
      // 4. PROFILE SETTINGS
      // ==================================================
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("business_profile_settings")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Preview profile load error:",
          profileError
        );
      }

      setProfile(
        profileData || {
          logo_url: null,
          cover_url: null,
          about: "",
          theme: "modern",
          brand_color: "#2563EB",
          show_services: true,
          show_team: true,
          show_gallery: true,
          show_location: true,
          published: false,
        }
      );

      // ==================================================
      // 5. SERVICES
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
            description,
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
          "Preview services load error:",
          serviceError
        );
      }

      setServices(serviceData || []);

      // ==================================================
      // 6. PROVIDERS
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
          "Preview providers load error:",
          providerError
        );
      }

      setProviders(providerData || []);

      // ==================================================
      // 7. GALLERY
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
          "Preview gallery load error:",
          galleryError
        );
      }

      setGallery(galleryData || []);
    } catch (error) {
      console.error("Preview load error:", error);

      setAuthMessage(
        lang === "es"
          ? "Ocurrió un error cargando la vista previa."
          : "An error occurred while loading the preview."
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
  // NOT AUTHORIZED
  // ==================================================
  if (!authorized || !business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white border rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔒</div>

          <h1 className="text-xl font-bold text-gray-900">
            {lang === "es"
              ? "Vista previa privada"
              : "Private preview"}
          </h1>

          <p className="text-gray-500 mt-3 text-sm leading-6">
            {authMessage ||
              (lang === "es"
                ? "Debes iniciar sesión como propietario de este negocio para ver esta página."
                : "You must be signed in as the owner of this business to view this page.")}
          </p>

          <button
            type="button"
            onClick={() => router.back()}
            className="mt-6 bg-black text-white px-5 py-3 rounded-xl font-semibold"
          >
            {lang === "es" ? "← Volver" : "← Go back"}
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
  // PAGE
  // ==================================================
  return (
    <div
      className={`min-h-screen ${themeStyles.page}`}
    >
      {/* ============================================= */}
      {/* PREVIEW CONTROL BAR */}
      {/* ============================================= */}
      <div className="relative z-50 bg-gray-950 text-white border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400">
              FlowPayDR
            </div>

            <div className="font-semibold">
              {lang === "es"
                ? "Vista previa de tu página"
                : "Your page preview"}
            </div>

            {!profile?.published && (
              <div className="text-xs text-amber-300 mt-1">
                {lang === "es"
                  ? "Borrador privado — tus clientes todavía no ven esta versión."
                  : "Private draft — your customers cannot see this version yet."}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setLang((current) =>
                  current === "es" ? "en" : "es"
                )
              }
              className="border border-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-800"
            >
              {lang === "es" ? "EN" : "ES"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold"
            >
              {lang === "es"
                ? "← Volver al panel"
                : "← Back to dashboard"}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* BUSINESS PAGE */}
      {/* ============================================= */}
      <main>
        {/* HERO */}
        <section className="relative">
          <div className="relative h-[360px] sm:h-[440px] lg:h-[520px] overflow-hidden bg-gray-900">
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

        {/* ABOUT */}
        {profile?.about && (
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
              {profile.about}
            </p>
          </section>
        )}

        {/* SERVICES */}
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
                  {services.length}{" "}
                  {services.length === 1
                    ? lang === "es"
                      ? "servicio"
                      : "service"
                    : lang === "es"
                    ? "servicios"
                    : "services"}
                </span>
              </div>

              {services.length === 0 ? (
                <EmptyState
                  text={
                    lang === "es"
                      ? "Todavía no hay servicios disponibles."
                      : "There are no services available yet."
                  }
                />
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {services.map((service) => (
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
                        {service.name}
                      </h3>

                      {service.description && (
                        <p className="text-sm text-gray-500 leading-6 mt-3">
                          {service.description}
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

        {/* TEAM */}
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

        {/* GALLERY */}
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

        {/* LOCATION */}
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
              </div>
            </div>
          </section>
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