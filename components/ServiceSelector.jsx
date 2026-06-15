"use client";

const t = {
  es: {
    title: "Elige tu servicio",
    currency: "RD$",
    haircut: "Corte de pelo",
    beard: "Recorte de barba",
    combo: "Corte + Barba",
  },
  en: {
    title: "Choose your service",
    currency: "$",
    haircut: "Haircut",
    beard: "Beard Trim",
    combo: "Haircut + Beard",
  },
};

export default function ServiceSelector({ business, onSelect, lang }) {
  const tr = t[lang];

  const services = [
    { id: "haircut", name: tr.haircut, price: 20 },
    { id: "beard", name: tr.beard, price: 15 },
    { id: "combo", name: tr.combo, price: 30 },
  ];

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">{tr.title}</h2>

      <div className="grid grid-cols-1 gap-4">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className="p-4 border rounded-xl shadow-sm hover:shadow-md transition bg-white text-left"
          >
            <p className="font-medium text-lg">{service.name}</p>
            <p className="text-sm text-gray-500">
              {tr.currency}
              {service.price}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
