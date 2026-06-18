"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const t = {
  es: { title: "Elige tu barbero" },
  en: { title: "Choose your barber" },
};

export default function BarberSelector({ onSelect, lang }) {
  const tr = t[lang];
  const [barbers, setBarbers] = useState([]);

  useEffect(() => {
    loadBarbers();
  }, []);

  async function loadBarbers() {
    const { data } = await supabase
      .from("barbers")
      .select("*")
      .eq("active", true);

    setBarbers(data || []);
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">{tr.title}</h2>

      <div className="grid grid-cols-1 gap-3">
        {barbers.map((barber) => (
          <button
            key={barber.id}
            onClick={() => onSelect(barber)}
            className="p-4 border rounded-lg hover:bg-gray-100 text-left"
          >
            <p className="font-medium">{barber.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
