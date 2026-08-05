"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ⭐ Bilingual dictionary
const t = {
  es: {
    title: "Horario de Trabajo",
    loading: "Cargando disponibilidad...",
    open: "Abierto",
    closed: "Cerrado",
    save: "Guardar",
    saving: "Guardando...",
    dayNames: {
      monday: "Lunes",
      tuesday: "Martes",
      wednesday: "Miércoles",
      thursday: "Jueves",
      friday: "Viernes",
      saturday: "Sábado",
      sunday: "Domingo",
    },
  },
  en: {
    title: "Weekly Availability",
    loading: "Loading availability...",
    open: "Open",
    closed: "Closed",
    save: "Save",
    saving: "Saving...",
    dayNames: {
      monday: "Monday",
      tuesday: "Tuesday",
      wednesday: "Wednesday",
      thursday: "Thursday",
      friday: "Friday",
      saturday: "Saturday",
      sunday: "Sunday",
    },
  },
};

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function AvailabilityPage() {
  const { barberId } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState("es");

  const tr = t[lang];

  useEffect(() => {
    loadAvailability();
  }, []);

  async function loadAvailability() {
    const { data } = await supabase
      .from("barber_availability")
      .select("*")
      .eq("barber_id", barberId);

    const fullWeek = DAYS.map((day) => {
      const existing = data?.find((r) => r.day_of_week === day);
      return (
        existing || {
          barber_id: barberId,
          day_of_week: day,
          start_time: "08:00",
          end_time: "22:00",
          is_closed: false,
        }
      );
    });

    setRows(fullWeek);
    setLoading(false);
  }

  async function saveRow(row) {
  setSaving(true);

  const { error } = await supabase.from("barber_availability").upsert(
    {
      barber_id: barberId,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      is_closed: row.is_closed,
    },
    { onConflict: "barber_id,day_of_week" }   // ⭐ FINAL FIX
  );

  if (error) {
    alert("Error saving availability");
    console.error(error);
  }

  setSaving(false);
}

  function updateField(day, field, value) {
    const updated = rows.map((r) =>
      r.day_of_week === day ? { ...r, [field]: value } : r
    );
    setRows(updated);
  }

  if (loading) return <p className="p-6">{tr.loading}</p>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow">
      {/* ⭐ Language Switch */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          className={`px-3 py-1 rounded ${
            lang === "es" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("es")}
        >
          ES
        </button>
        <button
          className={`px-3 py-1 rounded ${
            lang === "en" ? "bg-black text-white" : "bg-gray-200"
          }`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-4">{tr.title}</h1>

      {rows.map((row) => (
        <div
          key={row.day_of_week}
          className="flex items-center justify-between border-b py-3"
        >
          <div className="w-24 capitalize font-semibold">
            {tr.dayNames[row.day_of_week]}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!row.is_closed}
                onChange={(e) =>
                  updateField(row.day_of_week, "is_closed", !e.target.checked)
                }
              />
              {row.is_closed ? tr.closed : tr.open}
            </label>

            {!row.is_closed && (
              <>
                <input
                  type="time"
                  value={row.start_time}
                  onChange={(e) =>
                    updateField(row.day_of_week, "start_time", e.target.value)
                  }
                  className="border p-2 rounded"
                />

                <input
                  type="time"
                  value={row.end_time}
                  onChange={(e) =>
                    updateField(row.day_of_week, "end_time", e.target.value)
                  }
                  className="border p-2 rounded"
                />
              </>
            )}

            <button
              onClick={() => saveRow(row)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg"
            >
              {tr.save}
            </button>
          </div>
        </div>
      ))}

      {saving && <p className="text-green-600 mt-3">{tr.saving}</p>}
    </div>
  );
}
