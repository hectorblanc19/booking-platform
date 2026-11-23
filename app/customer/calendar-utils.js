const DEFAULT_TIMEZONE = "America/Santo_Domingo";

function getUtcDate(date, time, timezone) {
  const utcGuess = Date.parse(`${date}T${time}Z`);

  if (!Number.isFinite(utcGuess)) {
    throw new Error("Invalid appointment date");
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });

  const expected = `${date}T${time.slice(0, 5)}`;

  // Check possible UTC offsets, including daylight-saving changes.
  // Check larger offsets first to select the earliest repeated local time.
  for (let offset = 14; offset >= -12; offset--) {
    const candidate = new Date(utcGuess - offset * 3600000);

    const parts = Object.fromEntries(
      formatter.formatToParts(candidate)
        .filter(part => part.type !== "literal")
        .map(part => [part.type, part.value])
    );

    const actual =
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;

    if (actual === expected) {
      return candidate;
    }
  }

  throw new Error("Invalid or nonexistent local appointment time");
}

function getCalendarTimes(appointment, timezone = DEFAULT_TIMEZONE) {
  const date = String(appointment.date || "");
  const time = String(appointment.time || "");
  const duration = Number(appointment.duration);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}(:\d{2})?$/.test(time) ||
      !Number.isFinite(duration) ||
      duration <= 0) {
    throw new Error("Invalid appointment calendar details");
  }

  const start = getUtcDate(date, time, timezone);

  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid appointment date");
  }

  const end = new Date(start.getTime() + duration * 60000);

  const stamp = value =>
    value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  return { start: stamp(start), end: stamp(end) };
}

function escapeICS(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function googleCalendarUrl(appointment, details = {}) {
  const { start, end } = getCalendarTimes(appointment, details.timezone || DEFAULT_TIMEZONE);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: details.title || "Appointment",
    dates: `${start}/${end}`,
    details: details.description || "",
    location: details.location || "",
    ctz: details.timezone || DEFAULT_TIMEZONE
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

export function downloadAppointmentICS(appointment, details = {}) {
  const { start, end } = getCalendarTimes(appointment, details.timezone || DEFAULT_TIMEZONE);

  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FlowPayDR//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@flowpaydr.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(details.title || "Appointment")}`,
    `DESCRIPTION:${escapeICS(details.description || "")}`,
    `LOCATION:${escapeICS(details.location || "")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "flowpaydr-appointment.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}