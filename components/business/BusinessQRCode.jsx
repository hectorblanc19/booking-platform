"use client";

export default function BusinessQRCode({
  t,
  lang,
  businessId,
  isBarberBusiness = false,
}) {
  // Barber shops must send customers to barber selection first.
  // All other businesses continue using the generic business booking page.
  const bookingUrl = isBarberBusiness
    ? `https://www.flowpaydr.com/select-barber/${businessId}`
    : `https://www.flowpaydr.com/business/${businessId}/booking`;

  const qrUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      bookingUrl
    )}`;

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-3">
        {t[lang].qrCode}
      </h2>

      <div className="bg-white p-4 rounded-xl shadow inline-block">
        <img
          src={qrUrl}
          alt="Business QR Code"
          className="w-40 h-40 mx-auto mb-3"
        />

        <p className="text-gray-600 mb-2 text-center">
          {isBarberBusiness
            ? lang === "es"
              ? "Comparte este QR para que los clientes seleccionen su barbero y reserven."
              : "Share this QR so clients can select their barber and book."
            : lang === "es"
            ? "Comparte este QR para que los clientes puedan reservar."
            : "Share this QR so clients can book your business."}
        </p>

        <p className="text-gray-400 text-xs mb-3 text-center">
          {lang === "es"
            ? "Mantén presionada la imagen 3 segundos para copiar, guardar o compartir."
            : "Hold the image for 3 seconds to copy, save, or share."}
        </p>

        <button
          onClick={() => {
            const link = document.createElement("a");

            link.href = qrUrl;
            link.download = `business-${businessId}-qr.png`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm mx-auto block"
        >
          {lang === "es" ? "Descargar QR" : "Download QR"}
        </button>
      </div>
    </section>
  );
}