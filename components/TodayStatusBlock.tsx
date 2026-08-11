"use client";

import OpenStatusClient from "./OpenStatusClient";

type Props = {
  today: any;
  lang: string;
  weekly: any[];
};

function cleanTime(t: string) {
  return t?.slice(0, 5); // "09:00:00" → "09:00"
}

export default function TodayStatusBlock({ today, lang, weekly }: Props) {
  const start = cleanTime(today.start_time);
  const end = cleanTime(today.end_time);

  // Tomorrow logic
  const tomorrowIndex = (new Date().getDay() + 1) % 7;
  const map = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const tomorrowName = map[tomorrowIndex];

  const tomorrow = weekly?.find(w => w.day_of_week === tomorrowName);
  const tomorrowStart = cleanTime(tomorrow?.start_time);
  const tomorrowEnd = cleanTime(tomorrow?.end_time);

  return (
    <div className="flex flex-col gap-1 text-sm font-medium text-slate-800">

      {/* Today */}
      <div className="flex items-center gap-2">
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

      {/* Tomorrow */}
      {tomorrow && (
        <span className="text-slate-600">
          {lang === "es" ? "Mañana:" : "Tomorrow:"}{" "}
          {tomorrow.is_closed
            ? (lang === "es" ? "Cerrado" : "Closed")
            : `${tomorrowStart} – ${tomorrowEnd}`}
        </span>
      )}
    </div>
  );
}
