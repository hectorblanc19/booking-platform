"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BarberLoginPage() {
  const router = useRouter();
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

  function selectBarber(barber) {
    router.push(`/barber/${barber.id}/dashboard`);
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Barber Login</h1>

      {barbers.map((barber) => (
        <div
          key={barber.id}
          className="border p-4 rounded mb-3 cursor-pointer hover:bg-gray-100"
          onClick={() => selectBarber(barber)}
        >
          <p className="font-semibold">{barber.name}</p>
        </div>
      ))}
    </div>
  );
}
