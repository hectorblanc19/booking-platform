"use client";

import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function SelectBarber() {
  const { businessId } = useParams();
  const [barbers, setBarbers] = useState([]);

  useEffect(() => {
    loadBarbers();
  }, []);

  async function loadBarbers() {
    const { data } = await supabase
      .from("barbers")
      .select("*")
      .eq("business_id", businessId);

    setBarbers(data || []);
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Selecciona un Barbero</h1>

      {barbers.length === 0 && <p>No hay barberos disponibles.</p>}

      <div className="grid gap-4 mt-6">
        {barbers.map((b) => (
          <Link key={b.id} href={`/booking/${b.id}`}>
            <div className="p-4 bg-white shadow rounded-xl cursor-pointer hover:bg-gray-100">
              <h2 className="text-xl font-semibold">{b.name}</h2>
              <p className="text-gray-600">{b.email}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
