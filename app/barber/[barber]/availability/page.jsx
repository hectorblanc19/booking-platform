"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
  const { barber } = useParams();
  const [availability, setAvailability] = useState([]);

  // Load availability on page load
  useEffect(() => {
    loadAvailability();
  }, []);

  async function loadAvailability() {
    const { data, error } = await supabase
      .from("barber_availability")
      .select("*")
      .eq("barber", barber);

    if (error) {
      console.error("Load error:", error);
      return;
    }

    // If no rows exist, create default schedule
    if (data.length === 0) {
      const defaultRows = DAYS.map((day) => ({
        barber,
        day_of_week: day,
        start_time: "09:00",
        end_time: "17:00",
        is_closed: false,
      }));

      const { data: inserted } = await supabase
        .from("barber_availability")
        .insert(defaultRows)
        .select("*");

      setAvailability(inserted);
    } else {
      setAvailability(data);
    }
  }

  // Update local state when user edits fields
  function updateField(day, field, value) {
    setAvailability((prev) =>
      prev.map((row) =>
        row.day_of_week === day ? { ...row, [field]: value } : row
      )
    );
  }

  // Save all rows to Supabase
  async function saveAvailability() {
    const { error } = await supabase
      .from("barber_availability")
      .upsert(availability);

    if (error) {
      console.error("Save error:", error);
      alert("Error saving schedule");
    } else {
      alert("Schedule saved!");
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Availability for {barber}
      </h1>

      <div className="space-y-4">
        {availability.map((row) => (
          <div
            key={row.day_of_week}
            className="border p-4 rounded-lg flex items-center justify-between"
          >
            <div className="font-semibold capitalize w-32">
              {row.day_of_week}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex flex-col text-sm">
                Start
                <input
                  type="time"
                  value={row.start_time}
                  disabled={row.is_closed}
                  onChange={(e) =>
                    updateField(row.day_of_week, "start_time", e.target.value)
                  }
                  className="border p-1 rounded"
                />
              </label>

              <label className="flex flex-col text-sm">
                End
                <input
                  type="time"
                  value={row.end_time}
                  disabled={row.is_closed}
                  onChange={(e) =>
                    updateField(row.day_of_week, "end_time", e.target.value)
                  }
                  className="border p-1 rounded"
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.is_closed}
                  onChange={(e) =>
                    updateField(row.day_of_week, "is_closed", e.target.checked)
                  }
                />
                Closed
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={saveAvailability}
        className="mt-6 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Save Schedule
      </button>
    </div>
  );
}
