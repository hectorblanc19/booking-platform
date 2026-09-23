"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DAYS = [
  { value: 0, es: "Domingo", en: "Sunday" },
  { value: 1, es: "Lunes", en: "Monday" },
  { value: 2, es: "Martes", en: "Tuesday" },
  { value: 3, es: "Miércoles", en: "Wednesday" },
  { value: 4, es: "Jueves", en: "Thursday" },
  { value: 5, es: "Viernes", en: "Friday" },
  { value: 6, es: "Sábado", en: "Saturday" },
];

function createDefaultHours() {
  return DAYS.map((day) => ({
    id: null,
    day_of_week: day.value,
    is_open: day.value >= 1 && day.value <= 5,
    open_time: "09:00",
    close_time: "18:00",
  }));
}

export default function BusinessHours({
  businessId,
  lang = "es",
  showToast,
}) {
  const [hours, setHours] = useState(createDefaultHours());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (businessId) {
      loadBusinessHours();
    }
  }, [businessId]);

  async function loadBusinessHours() {
    setLoading(true);

    const { data, error } = await supabase
      .from("business_hours")
      .select("*")
      .eq("business_id", businessId)
      .order("day_of_week", { ascending: true });

    if (error) {
      console.error("Business hours loading error:", error);

      showToast?.(
        lang === "es"
          ? "No se pudo cargar el horario del negocio."
          : "Could not load business hours."
      );

      setLoading(false);
      return;
    }

    const defaults = createDefaultHours();

    const merged = defaults.map((defaultDay) => {
      const savedDay = (data || []).find(
        (row) => Number(row.day_of_week) === defaultDay.day_of_week
      );

      if (!savedDay) {
        return defaultDay;
      }

      return {
        id: savedDay.id,
        day_of_week: Number(savedDay.day_of_week),
        is_open: savedDay.is_open,
        open_time: savedDay.open_time
          ? String(savedDay.open_time).slice(0, 5)
          : "09:00",
        close_time: savedDay.close_time
          ? String(savedDay.close_time).slice(0, 5)
          : "18:00",
      };
    });

    setHours(merged);
    setLoading(false);
  }

  function updateDay(dayIndex, field, value) {
    setHours((current) =>
      current.map((day) =>
        day.day_of_week === dayIndex
          ? {
              ...day,
              [field]: value,
            }
          : day
      )
    );
  }

  async function saveBusinessHours() {
    if (!businessId || saving) return;

    for (const day of hours) {
      if (day.is_open) {
        if (!day.open_time || !day.close_time) {
          showToast?.(
            lang === "es"
              ? "Completa las horas de los días abiertos."
              : "Complete the hours for open days."
          );
          return;
        }

        if (day.close_time <= day.open_time) {
          const dayName =
            DAYS.find((item) => item.value === day.day_of_week)?.[lang] || "";

          showToast?.(
            lang === "es"
              ? `La hora de cierre de ${dayName} debe ser después de la hora de apertura.`
              : `${dayName}'s closing time must be after the opening time.`
          );
          return;
        }
      }
    }

    setSaving(true);

    try {
      const rows = hours.map((day) => ({
        business_id: businessId,
        day_of_week: day.day_of_week,
        is_open: day.is_open,
        open_time: day.is_open ? day.open_time : null,
        close_time: day.is_open ? day.close_time : null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("business_hours")
        .upsert(rows, {
          onConflict: "business_id,day_of_week",
        });

      if (error) {
        console.error("Business hours save error:", error);

        showToast?.(
          lang === "es"
            ? "No se pudo guardar el horario del negocio."
            : "Could not save business hours."
        );

        return;
      }

      await loadBusinessHours();

      showToast?.(
        lang === "es"
          ? "Horario del negocio guardado correctamente."
          : "Business hours saved successfully."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-3">
          {lang === "es" ? "Horario del negocio" : "Business Hours"}
        </h2>

        <div className="bg-white border rounded-xl shadow p-5">
          <p className="text-gray-500">
            {lang === "es" ? "Cargando horario..." : "Loading hours..."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-3">
        {lang === "es" ? "Horario del negocio" : "Business Hours"}
      </h2>

      <p className="text-sm text-gray-500 mb-4">
        {lang === "es"
          ? "Este es el horario general del negocio. El horario de cada profesional se configura por separado."
          : "These are the general store hours. Each professional's schedule is configured separately."}
      </p>

      <div className="bg-white border rounded-xl shadow divide-y">
        {hours.map((day) => {
          const dayInfo = DAYS.find(
            (item) => item.value === day.day_of_week
          );

          return (
            <div
              key={day.day_of_week}
              className="p-4 sm:p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {dayInfo?.[lang]}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      updateDay(
                        day.day_of_week,
                        "is_open",
                        !day.is_open
                      )
                    }
                    className={`mt-2 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      day.is_open
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {day.is_open
                      ? lang === "es"
                        ? "Abierto"
                        : "Open"
                      : lang === "es"
                      ? "Cerrado"
                      : "Closed"}
                  </button>
                </div>

                {day.is_open && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
                    <label className="text-sm">
                      <span className="block text-gray-600 mb-1">
                        {lang === "es"
                          ? "Hora de apertura"
                          : "Opening time"}
                      </span>

                      <input
                        type="time"
                        value={day.open_time}
                        onChange={(e) =>
                          updateDay(
                            day.day_of_week,
                            "open_time",
                            e.target.value
                          )
                        }
                        className="border rounded-lg px-3 py-2 w-full"
                      />
                    </label>

                    <label className="text-sm">
                      <span className="block text-gray-600 mb-1">
                        {lang === "es"
                          ? "Hora de cierre"
                          : "Closing time"}
                      </span>

                      <input
                        type="time"
                        value={day.close_time}
                        onChange={(e) =>
                          updateDay(
                            day.day_of_week,
                            "close_time",
                            e.target.value
                          )
                        }
                        className="border rounded-lg px-3 py-2 w-full"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={saveBusinessHours}
        disabled={saving}
        className={`mt-4 px-5 py-3 rounded-xl font-semibold ${
          saving
            ? "bg-gray-300 text-gray-600"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {saving
          ? lang === "es"
            ? "Guardando..."
            : "Saving..."
          : lang === "es"
          ? "Guardar horario del negocio"
          : "Save Business Hours"}
      </button>
    </section>
  );
}