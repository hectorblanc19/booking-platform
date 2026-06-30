"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import QRCode from "react-qr-code";

export default function BusinessBookingPage() {
  const { businessId } = useParams();
  const router = useRouter();

  const [business, setBusiness] = useState(null);
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState("en");

  const t = {
    en: {
      bookAt: "Book at",
      scanBusiness: "Scan to book this business",
      selectBarber: "Select a barber to continue:",
      scanBarber: "Scan to book",
      book: "Book",
    },
    es: {
      bookAt: "Reservar en",
      scanBusiness: "Escanea para reservar este negocio",
      selectBarber: "Selecciona un barbero para continuar:",
      scanBarber: "Escanear para reservar a",
      book: "Reservar",
    },
  };

  const tr = t[lang];

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://flowpaydr.com";

  const businessBookingUrl = `${baseUrl}/business/${businessId}/booking`;

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
    <div className="min-h-screen bg-gray-100 p-6 max-w-xl mx-auto">
      
      {/* Language Toggle */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          onClick={() => setLang("en")}
          className={`px-3 py-1 rounded text-sm ${
            lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang("es")}
          className={`px-3 py-1 rounded text-sm ${
            lang === "es" ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          ES
        </button>
      </div>

      {/* BUSINESS NAME */}
      <h1 className="text-3xl font-bold mb-6 text-center">
        {tr.bookAt} {business?.name}
      </h1>

      {/* BUSINESS QR CODE */}
      <div className="mb-8 text-center">
        <p className="font-semibold mb-2">{tr.scanBusiness}</p>
        <div className="inline-block bg-white p-4 rounded-xl shadow">
          <QRCode value={businessBookingUrl} size={150} />
        </div>
        <p className="text-xs mt-2 text-gray-500 break-all">
          {businessBookingUrl}
        </p>
      </div>

      <p className="mb-4 text-gray-600 text-center">{tr.selectBarber}</p>

      {/* BARBER LIST */}
      <div className="space-y-6">
        {barbers.map((b) => {
          const barberBookingUrl = `${baseUrl}/booking/${b.id}`;

          return (
            <div
              key={b.id}
              className="p-4 border rounded-xl shadow bg-white"
            >
              {/* Barber photo */}
              <div className="flex items-center gap-4">
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

              {/* Barber QR code */}
              <div className="mt-4 text-center">
                <p className="text-sm font-medium mb-1">
                  {tr.scanBarber} {b.name}
                </p>
                <div className="inline-block bg-white p-3 rounded-xl shadow">
                  <QRCode value={barberBookingUrl} size={120} />
                </div>
                <p className="text-xs mt-2 text-gray-500 break-all">
                  {barberBookingUrl}
                </p>
              </div>

              {/* Button to go to barber booking page */}
              <button
                onClick={() => router.push(`/booking/${b.id}`)}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg"
              >
                {tr.book} {b.name}
              </button>
            </div>
          );
        })}
      </div>

      {barbers.length === 0 && (
        <p className="mt-4 text-red-600 text-center">
          No barbers found for this business.
        </p>
      )}
    </div>
  );
}
