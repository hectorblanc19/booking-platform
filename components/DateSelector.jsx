"use client";

import { useState } from "react";

const t = {
  es: {
    title: "Elige una fecha",
  },
  en: {
    title: "Choose a date",
  },
};

export default function DateSelector({ onSelect, lang }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const tr = t[lang];

  // Generate the next 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);

    return {
      id: i,
      date,
      label: date.toLocaleDateString(
        lang === "es" ? "es-DO" : "en-US",
        {
          weekday: "short",
          month: "short",
          day: "numeric",
        }
      ),
    };
  });

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">{tr.title}</h2>

      <div className="grid grid-cols-2 gap-4">
        {days.map((day) => (
          <button
            key={day.id}
            onClick={() => {
              setSelectedDate(day.date);
              onSelect(day.date);
            }}
            className={`p-4 border rounded-xl shadow-sm transition bg-white text-left ${
              selectedDate?.toDateString() === day.date.toDateString()
                ? "border-black shadow-md"
                : "hover:shadow-md"
            }`}
          >
            <p className="font-medium">{day.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
