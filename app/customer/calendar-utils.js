const TIMEZONE = "America/Santo_Domingo";

function getCalendarTimes(appointment) {
  const date = String(appointment.date || "");
  const time = String(appointment.time || "");
  const duration = Number(appointment.duration);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^\d{2}:\d{2}(:\d{2})?$/.test(time) ||
      !Number.isFinite(duration) ||
      duration <= 0) {
    throw new Error("Invalid appointment calendar details");
  }

  const start = new Date(`${date}T${time}-04:00`);

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
  const { start, end } = getCalendarTimes(appointment);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: details.title || "Appointment",
    dates: `${start}/${end}`,
    details: details.description || "",
    location: details.location || "",
    ctz: TIMEZONE
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

export function downloadAppointmentICS(appointment, details = {}) {
  const { start, end } = getCalendarTimes(appointment);

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