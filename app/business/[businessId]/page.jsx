"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import QRCode from "react-qr-code";

export default function BusinessPublicPage() {
  const { businessId } = useParams();
  const router = useRouter();

  const [business, setBusiness] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [userBarber, setUserBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("en");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://flowpaydr.com";

  const businessBookingUrl = `${baseUrl}/business/${businessId}/booking`;

  const t = {
    en: {
      bookAt: "Book at",
      scanBusiness: "Scan to book this business",
      bookNow: "Book Now",
      ourBarbers: "Our Barbers",
      scanBarber: "Scan to book",
      editBusiness: "Edit Business",
      location: "Location",
    },
    es: {
      bookAt: "Reservar en",
      scanBusiness: "Escanea para reservar este negocio",
      bookNow: "Reservar Ahora",
      ourBarbers: "Nuestros Barberos",
      scanBarber: "Escanear para reservar a",
      editBusiness: "Editar Negocio",
      location: "Ubicación",
    },
  };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    setBusiness(biz || null);

    const { data: bar } = await supabase
      .from("barbers")
      .select("*")
      .eq("business_id", businessId);

    setBarbers(bar || []);
    setLoading(false);
  }

  // Detect logged-in barber (owner)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return;

      const { data: barber } = await supabase
        .from("barbers")
        .select("*")
        .eq("auth_id", data.user.id)
        .single();

      setUserBarber(barber);
    });
  }, []);

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar / language + brand */}
      <header className="w-full bg-white border-b">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="font-bold text-lg">FlowPayDR</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-l text-sm ${
                lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("es")}
              className={`px-3 py-1 rounded-r text-sm ${
                lang === "es" ? "bg-blue-600 text-white" : "bg-gray-200"
              }`}
            >
              ES
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Owner-only Edit Business Button */}
        {userBarber?.business_id === businessId && (
          <div className="mb-4">
            <button
              onClick={() =>
                router.push(
                  `/business/${businessId}/dashboard?key=${business?.secret_key}`
                )
              }
              className="w-full md:w-auto bg-gray-800 text-white px-4 py-2 rounded-lg text-sm"
            >
              {t[lang].editBusiness}
            </button>
          </div>
        )}

        {/* HERO SECTION */}
        <section className="bg-white rounded-2xl shadow-md overflow-hidden mb-8">
          <div className="h-40 w-full bg-gray-200">
            <img
              src={business?.photo_url || "/default-business.png"}
              alt={business?.name}
              className="w-full h-40 object-cover"
            />
          </div>
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                {business?.name || "Barbershop"}
              </h1>
              <p className="text-gray-500 mt-1">
                {t[lang].bookAt} {business?.name}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() =>
                  router.push(`/business/${businessId}/booking`)
                }
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-semibold"
              >
                {t[lang].bookNow}
              </button>
              {business?.address && (
                <p className="text-xs text-gray-500 text-center">
                  {t[lang].location}: {business.address}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* QR + INFO SECTION */}
        <section className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <p className="font-semibold mb-2">{t[lang].scanBusiness}</p>
            <div className="inline-block bg-white p-4 rounded-xl shadow">
              <QRCode value={businessBookingUrl} size={150} />
            </div>
            <p className="text-xs mt-2 text-gray-500 break-all">
              {businessBookingUrl}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
  <h2 className="text-lg font-semibold mb-2">
    {t[lang].bookAt} {business?.name}
  </h2>

  <p className="text-sm text-gray-600">
    {lang === "es"
      ? `Reserva tu cita en línea con ${business?.name}. Elige tu barbero, selecciona la hora y confirma al instante.`
      : `Book your appointment online with ${business?.name}. Choose your barber, pick a time, and confirm instantly.`}
  </p>
</div>
</section>
        {/* BARBERS SECTION */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">
            {t[lang].ourBarbers}
          </h2>

          {barbers.length === 0 && (
            <p className="text-gray-500 text-sm">
              No barbers listed yet for this business.
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {barbers.map((b) => {
              const barberBookingUrl = `${baseUrl}/booking/${b.id}`;

              return (
                <div
                  key={b.id}
                  className="bg-white p-4 border rounded-2xl shadow-sm flex flex-col gap-4"
                >
                  {/* Barber header */}
                  <div className="flex items-center gap-4">
                    <img
                      src={b.photo_url || "/default-barber.png"}
                      alt={b.name}
                      className="w-16 h-16 rounded-full object-cover border"
                    />
                    <div className="flex-1">
                      <p className="text-lg font-semibold">{b.name}</p>
                      <p className="text-xs text-gray-500">{b.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Barber at {business?.name}
                      </p>
                    </div>
                  </div>

                  {/* Barber actions */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => router.push(`/booking/${b.id}`)}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold"
                    >
                      {t[lang].bookNow} {b.name}
                    </button>

                    <div className="text-center">
                      <p className="text-xs font-medium mb-1">
                        {t[lang].scanBarber} {b.name}
                      </p>
                      <div className="inline-block bg-white p-3 rounded-xl shadow">
                        <QRCode value={barberBookingUrl} size={100} />
                      </div>
                      <p className="text-[10px] mt-2 text-gray-500 break-all">
                        {barberBookingUrl}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* MAP AT BOTTOM (optional, only if address exists) */}
        {business?.address && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-2">
              {t[lang].location}
            </h2>
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <iframe
                className="w-full h-48"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(
                  business.address
                )}&z=15&output=embed`}
              ></iframe>
            </div>
          </section>
        )}
      </main>

      <footer className="w-full border-t bg-white mt-8">
        <div className="max-w-4xl mx-auto px-6 py-4 text-xs text-gray-500 flex justify-between">
          <span>FlowPayDR · Smart booking for barbershops</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
