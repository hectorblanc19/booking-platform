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

  // Auto-detect domain (localhost or flowpaydr.com)
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

    // Load business
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    setBusiness(biz || null);

    // Load barbers
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
      {/* BUSINESS NAME */}
      <h1 className="text-3xl font-bold mb-6 text-center">
        Book at {business?.name}
      </h1>

      {/* BUSINESS QR CODE */}
      <div className="mb-8 text-center">
        <p className="font-semibold mb-2">Scan to book this business</p>
        <div className="inline-block bg-white p-4 rounded-xl shadow">
          <QRCode value={businessBookingUrl} size={150} />
        </div>
        <p className="text-xs mt-2 text-gray-500">{businessBookingUrl}</p>
      </div>

      <p className="mb-4 text-gray-600 text-center">
        Select a barber to continue:
      </p>

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
                  Scan to book {b.name}
                </p>
                <div className="inline-block bg-white p-3 rounded-xl shadow">
                  <QRCode value={barberBookingUrl} size={120} />
                </div>
                <p className="text-xs mt-2 text-gray-500">
                  {barberBookingUrl}
                </p>
              </div>

              {/* Button to go to barber booking page */}
              <button
                onClick={() => router.push(`/booking/${b.id}`)}
                className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg"
              >
                Book {b.name}
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
