"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function SelectBusiness() {
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function loadBusinesses() {
    const { data } = await supabase.from("businesses").select("*");
    setBusinesses(data || []);
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Selecciona un Negocio</h1>

      {businesses.length === 0 && <p>No hay negocios disponibles.</p>}

      <div className="grid gap-4 mt-6">
        {businesses.map((b) => (
          <Link key={b.id} href={`/select-barber/${b.id}`}>
            <div className="p-4 bg-white shadow rounded-xl cursor-pointer hover:bg-gray-100">
              <h2 className="text-xl font-semibold">{b.name}</h2>
              <p className="text-gray-600">{b.address || "Sin dirección"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
