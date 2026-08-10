"use client";

import OpenStatusClient from "./OpenStatusClient";

function cleanTime(t) {
  // Converts "09:00:00" → "09:00"
  return t?.slice(0, 5);
}

export default function TodayStatusBlock({ today, lang }) {
  const start = cleanTime(today.start_time);
  const end = cleanTime(today.end_time);

  return (
    <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
      <OpenStatusClient
        start={start}
        end={end}
        isClosed={today.is_closed}
        lang={lang}
      />

      <span className="text-slate-600">
        — {lang === "es" ? "Horario de hoy:" : "Today's Hours:"}{" "}
        {today.is_closed
          ? (lang === "es" ? "Cerrado" : "Closed")
          : `${start} – ${end}`}
      </span>
    </div>
  );
}
