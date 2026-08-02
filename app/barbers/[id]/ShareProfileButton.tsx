"use client";

export default function ShareProfileButton({ lang, barberName, shareUrl }) {
  const label = lang === "es" ? "Compartir Perfil" : "Share Profile";

  const handleShare = () => {
    const message =
      lang === "es"
        ? `Mira este barbero en FlowPayDR:\n${shareUrl}`
        : `Check out this barber on FlowPayDR:\n${shareUrl}`;

    if (navigator.share) {
      navigator.share({
        title: barberName,
        text: message,
      });
    } else {
      alert(
        lang === "es"
          ? "Compartir no está disponible en este dispositivo."
          : "Sharing not supported on this device."
      );
    }
  };

  return (
    <button
      onClick={handleShare}
      className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700"
    >
      {label}
    </button>
  );
}
