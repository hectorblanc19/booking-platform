"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const t = {
  es: {
    loading: "Cargando horarios...",
    wait: "Por favor espera.",
    chooseTime: "Elige una hora",
    noTimes: "No hay horarios disponibles.",
  },
  en: {
    loading: "Loading time slots...",
    wait: "Please wait.",
    chooseTime: "Choose a time",
    noTimes: "No available time slots.",
  },
};

export default function TimeSelector({ selectedDate, onSelect, barber, lang }) {
  const [loading, setLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState([]);
  const [takenTimes, setTakenTimes] = useState([]);

  const tr = t[lang];

  const generateSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      const date = new Date(selectedDate);
      date.setHours(hour, 0, 0, 0);

      slots.push({
        label: date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        value: date,
      });
    }
    return slots;
  };

  const loadTakenTimes = async () => {
    const formattedDate = selectedDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("appointments")
      .select("time")
      .eq("barber_id", barber)   // ⭐ FIXED HERE
      .eq("date", formattedDate);

    if (error) {
      console.error("Error loading taken times:", error);
      return;
    }

    // ⭐ Normalize Supabase time to match UI format
    const booked = data?.map((a) =>
      new Date("1970-01-01 " + a.time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    );

    setTakenTimes(booked || []);
  };

  useEffect(() => {
    setLoading(true);

    async function load() {
      await loadTakenTimes();
      setTimeSlots(generateSlots());
      setLoading(false);
    }

    load();
  }, [selectedDate, barber]);

  if (loading) {
    return (
      <div className="mt-6 p-4 border rounded-xl bg-white shadow-sm">
        <h2 className="text-xl font-semibold mb-2">{tr.loading}</h2>
        <p className="text-gray-500">{tr.wait}</p>
      </div>
    );
  }

  // ⭐ Filter out taken slots
  const availableSlots = timeSlots.filter(
    (slot) => !takenTimes.includes(slot.label)
  );

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">{tr.chooseTime}</h2>

      {availableSlots.length === 0 && (
        <p className="text-gray-500">{tr.noTimes}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {availableSlots.map((slot, index) => (
          <button
            key={index}
            onClick={() => onSelect(slot.value)}
            className="p-4 border rounded-xl shadow-sm bg-white hover:shadow-md transition text-left"
          >
            <p className="font-medium">{slot.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
