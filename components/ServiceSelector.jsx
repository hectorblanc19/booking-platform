"use client";

const t = {
  es: {
    title: "Elige tu servicio",
    currency: "RD$", // You can change to "$" if needed
  },
  en: {
    title: "Choose your service",
    currency: "$",
  },
};

export default function ServiceSelector({ business, onSelect, lang }) {
  const tr = t[lang]; // translation shortcut

  const services = [
    { id: "haircut", name: "Haircut", price: 20 },
    { id: "beard", name: "Beard Trim", price: 15 },
    { id: "combo", name: "Haircut + Beard", price: 30 },
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
