"use client";

import OpenStatusClient from "./OpenStatusClient";

type Props = {
  today: any;
  lang: string;
  weekly: any[];
};

function cleanTime(t: string) {
  return t?.slice(0, 5);
}

// Convert 24-hour time to 12-hour AM/PM
function formatTime(t: string) {
  if (!t) return "";

  const clean = cleanTime(t);
  const [hourString, minute] = clean.split(":");

  let hour = Number(hourString);
  const period = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${period}`;
}

export default function TodayStatusBlock({ today, lang, weekly }: Props) {
  // Keep 24-hour values for OpenStatusClient calculations
  const start = cleanTime(today.start_time);
  const end = cleanTime(today.end_time);

  // 12-hour values for display
  const displayStart = formatTime(today.start_time);
  const displayEnd = formatTime(today.end_time);

  // Tomorrow logic
  const tomorrowIndex = (new Date().getDay() + 1) % 7;

  const map = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const tomorrowName = map[tomorrowIndex];

  const tomorrow = weekly?.find(
    (w) => w.day_of_week === tomorrowName
  );

  const tomorrowStart = formatTime(tomorrow?.start_time);
  const tomorrowEnd = formatTime(tomorrow?.end_time);

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
            ? lang === "es"
              ? "Cerrado"
              : "Closed"
            : `${displayStart} – ${displayEnd}`}
        </span>
      </div>

      {/* Tomorrow */}
      {tomorrow && (
        <span className="text-slate-600">
          {lang === "es" ? "Mañana:" : "Tomorrow:"}{" "}
          {tomorrow.is_closed
            ? lang === "es"
              ? "Cerrado"
              : "Closed"
            : `${tomorrowStart} – ${tomorrowEnd}`}
        </span>
      )}
    </div>
  );
}