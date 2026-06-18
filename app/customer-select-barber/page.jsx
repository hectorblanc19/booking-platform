"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function SelectBarberPage() {
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

  function chooseBarber(barber) {
    window.location.href = `/booking/${barber.id}`; // ✅ FIXED
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Choose Your Barber</h1>

      {barbers.map((barber) => (
        <div
          key={barber.id}
          className="border p-4 rounded mb-3 cursor-pointer"
          onClick={() => chooseBarber(barber)}
        >
          <p><strong>{barber.name}</strong></p>
          {barber.phone && <p>Phone: {barber.phone}</p>}
          {barber.email && <p>Email: {barber.email}</p>}
        </div>
      ))}
    </div>
  );
}
