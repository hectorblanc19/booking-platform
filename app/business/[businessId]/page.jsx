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
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("en");

  // Auto-detect domain
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
    },
    es: {
      bookAt: "Reservar en",
      scanBusiness: "Escanea para reservar este negocio",
      bookNow: "Reservar Ahora",
      ourBarbers: "Nuestros Barberos",
      scanBarber: "Escanear para reservar a",
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

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="max-w-xl mx-auto p-6">
      {/* Language Toggle */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setLang("en")}
          className={`px-3 py-1 rounded-l ${
            lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang("es")}
          className={`px-3 py-1 rounded-r ${
            lang === "es" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          ES
        </button>
      </div>

      {/* Business Name */}
      <h1 className="text-3xl font-bold text-center mb-4">
        {t[lang].bookAt} {business?.name}
      </h1>

      {/* Business QR Code */}
      <div className="text-center mb-6">
        <p className="font-semibold mb-2">{t[lang].scanBusiness}</p>
        <div className="inline-block bg-white p-4 rounded-xl shadow">
          <QRCode value={businessBookingUrl} size={150} />
        </div>
        <p className="text-xs mt-2 text-gray-500">{businessBookingUrl}</p>
      </div>

      {/* Book Now Button */}
      <button
        onClick={() => router.push(`/business/${businessId}/booking`)}
        className="w-full bg-blue-600 text-white py-3 rounded-lg mb-8"
      >
        {t[lang].bookNow}
      </button>

      {/* Barbers Section */}
      <h2 className="text-2xl font-semibold mb-4">{t[lang].ourBarbers}</h2>

      <div className="space-y-6">
        {barbers.map((b) => {
          const barberBookingUrl = `${baseUrl}/booking/${b.id}`;

          return (
            <div key={b.id} className="p-4 border rounded-xl shadow bg-white">
              <div className="flex items-center gap-4">
                {/* Barber Photo */}
                <img
                  src={b.photo_url || "/default-barber.png"}
                  alt={b.name}
                  className="w-16 h-16 rounded-full object-cover"
                />

                <div className="flex-1">
                  <p className="text-xl font-semibold">{b.name}</p>
                  <p className="text-gray-500">{b.email}</p>
                </div>
              </div>

              {/* Barber QR */}
              <div className="mt-4 text-center">
                <p className="text-sm font-medium mb-1">
                  {t[lang].scanBarber} {b.name}
                </p>
                <div className="inline-block bg-white p-3 rounded-xl shadow">
                  <QRCode value={barberBookingUrl} size={120} />
                </div>
                <p className="text-xs mt-2 text-gray-500">
                  {barberBookingUrl}
                </p>
              </div>

              {/* Book Barber Button */}
              <button
                onClick={() => router.push(`/booking/${b.id}`)}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg"
              >
                {t[lang].bookNow} {b.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
