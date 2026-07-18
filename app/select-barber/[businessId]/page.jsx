"use client";

import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SelectBarber() {
  console.log("🔥 SELECT BARBER PAGE LOADED");
  console.log("🔥 Component rendered at:", new Date().toISOString());

  const { businessId } = useParams();
  console.log("🔥 businessId from useParams:", businessId);

  const [barbers, setBarbers] = useState([]);
  const [lang, setLang] = useState("es");

  const t = {
    en: {
      title: "Select a Barber",
      noBarbers: "No barbers available.",
      noRatings: "No ratings yet",
      email: "Email",
      lang: "Language",
    },
    es: {
      title: "Selecciona un Barbero",
      noBarbers: "No hay barberos disponibles.",
      noRatings: "Sin calificaciones",
      email: "Correo",
      lang: "Idioma",
    },
  };

  useEffect(() => {
    console.log("🔥 useEffect triggered — calling loadData()");
    loadData();
  }, []);

  async function loadData() {
    console.log("🔥 loadData() STARTED");

    const { data: barberList, error: barberError } = await supabase
      .from("barbers")
      .select("*")
      .eq("business_id", businessId);

    console.log("🔥 Barbers query error:", barberError);
    console.log("🔥 Barbers loaded:", barberList);

    if (!barberList || barberList.length === 0) {
      console.log("🔥 No barbers found for business:", businessId);
      setBarbers([]);
      return;
    }

    const { data: ratingList, error: ratingError } = await supabase
      .from("ratings")
      .select("barber_id, rating")
      .in("barber_id", barberList.map((b) => b.id));

    console.log("🔥 Ratings query error:", ratingError);
    console.log("🔥 Ratings loaded:", ratingList);

    const ratingMap = {};
    ratingList?.forEach((r) => {
      if (!ratingMap[r.barber_id]) ratingMap[r.barber_id] = [];
      ratingMap[r.barber_id].push(r.rating);
    });

    barberList.forEach((barber) => {
      const arr = ratingMap[barber.id];
      if (!arr || arr.length === 0) {
        barber.avgRating = null;
      } else {
        barber.avgRating = (
          arr.reduce((a, b) => a + b, 0) / arr.length
        ).toFixed(1);
      }
    });

    console.log("🔥 Final barbers with avgRating:", barberList);

    setBarbers(barberList);
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      {console.log("🔥 JSX IS RUNNING IN BROWSER")}

      {/* Language Switch */}
      <div className="flex justify-end gap-2 mb-4">
        <span className="text-sm">{t[lang].lang}:</span>

        <button
          className={`px-2 py-1 rounded ${
            lang === "es" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("es")}
        >
          ES
        </button>

        <button
          className={`px-2 py-1 rounded ${
            lang === "en" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-4">{t[lang].title}</h1>

      {barbers.length === 0 && <p>{t[lang].noBarbers}</p>}

      <div className="grid gap-4 mt-6">
        {barbers.map((b) => (
          <Link key={b.id} href={`/booking/${b.id}`}>
            <div className="flex items-center gap-4 p-4 bg-white shadow rounded-xl cursor-pointer hover:bg-gray-100">

              {/* Barber Photo */}
              <img
                src={b.photo_url || "https://placehold.co/80x80?text=Barber"}
                alt=""
                className="w-20 h-20 rounded-full object-cover border"
              />

              {/* Barber Info */}
              <div className="flex flex-col">
                <h2 className="text-xl font-semibold">{b.name}</h2>

                {b.avgRating ? (
                  <p className="text-yellow-500 font-bold">
                    ⭐ {b.avgRating} / 5
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">{t[lang].noRatings}</p>
                )}

                <p className="text-gray-600 text-sm">
                  {t[lang].email}: {b.email}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
