"use client";

export default function OpenStatusClient({ start, end, isClosed, lang }) {
  function isBarberOpen(start, end) {
    if (!start || !end) return false;

    const now = new Date(); // LOCAL TIME (browser)
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  const openNow = !isClosed && isBarberOpen(start, end);

  return (
    <>
      <span className={`text-lg ${openNow ? "text-green-500" : "text-red-500"}`}>
        ●
      </span>

      <span>
        {openNow
          ? (lang === "es" ? "Abierto ahora" : "Open now")
          : (lang === "es" ? "Cerrado ahora" : "Closed now")}
      </span>
    </>
  );
}
