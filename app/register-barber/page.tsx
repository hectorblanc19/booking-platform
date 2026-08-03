"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "edge";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RegisterBarberPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const lang = searchParams.get("lang") === "es" ? "es" : "en";

  const translations = {
    en: {
      toggleES: "ES",
      toggleEN: "EN",
      title: "Register Barber",
      name: "Name",
      email: "Email",
      phone: "Phone",
      pin: "PIN",
      address: "Address",
      map: "Google Maps URL",
      category: "Category",
      barbershop: "Barbershop",
      independent: "Independent",
      services: "Services",
      workingDays: "Working Days",
      photo: "Photo",
      uploadPhoto: "Upload Photo",
      submit: "Register Barber",
      saving: "Saving...",
      success: "Barber registered successfully!",
      error: "Error creating barber",
      uploadError: "Error uploading photo",
      serviceLabels: {
        haircut: "Haircut",
        beard: "Beard",
        color: "Color",
        kids: "Kids",
        eyebrows: "Eyebrows",
        shave: "Shave",
        design: "Design",
        blowout: "Blowout",
        shapeup: "Shape Up",
      },
      dayLabels: {
        mon: "MON",
        tue: "TUE",
        wed: "WED",
        thu: "THU",
        fri: "FRI",
        sat: "SAT",
        sun: "SUN",
      },
    },
    es: {
      toggleES: "ES",
      toggleEN: "EN",
      title: "Registrar Barbero",
      name: "Nombre",
      email: "Correo",
      phone: "Teléfono",
      pin: "PIN",
      address: "Dirección",
      map: "URL de Google Maps",
      category: "Categoría",
      barbershop: "Barbería",
      independent: "Independiente",
      services: "Servicios",
      workingDays: "Días Laborales",
      photo: "Foto",
      uploadPhoto: "Subir Foto",
      submit: "Registrar Barbero",
      saving: "Guardando...",
      success: "¡Barbero registrado exitosamente!",
      error: "Error creando el barbero",
      uploadError: "Error subiendo la foto",
      serviceLabels: {
        haircut: "Corte",
        beard: "Barba",
        color: "Color",
        kids: "Niños",
        eyebrows: "Cejas",
        shave: "Afeitado",
        design: "Diseño",
        blowout: "Blowout",
        shapeup: "Shape Up",
      },
      dayLabels: {
        mon: "LUN",
        tue: "MAR",
        wed: "MIÉ",
        thu: "JUE",
        fri: "VIE",
        sat: "SÁB",
        sun: "DOM",
      },
    },
  };

  const t = translations[lang];

  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    pin: "",
    address: "",
    map_url: "",
    category: "barbershop",
    services: [],
    working_days: [],
  });

  const serviceOptions = [
    "haircut",
    "beard",
    "color",
    "kids",
    "eyebrows",
    "shave",
    "design",
    "blowout",
    "shapeup",
  ];

  const dayOptions = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  const toggleService = (service: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day],
    }));
  };

  const handlePhotoChange = (file: File | null) => {
    setPhoto(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);

    let photo_url = null;

    if (photo) {
      const safeId = Math.random().toString(36).substring(2);
      const fileName = `${safeId}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("barber-photos")
        .upload(fileName, photo);

      if (uploadError) {
        alert(t.uploadError);
        setLoading(false);
        return;
      }

      photo_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/barber-photos/${fileName}`;
    }

    const { data: barberData, error } = await supabase
      .from("barbers")
      .insert({
        name: form.name,
        email: form.email.toLowerCase(),
        phone: form.phone,
        pin: form.pin,
        address: form.address,
        map_url: form.map_url,
        category: form.category,
        services: form.services,
        working_days: form.working_days,
        photo_url,
        active: true,
        payment_status: "paid",
        featured: false,
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert(t.error);
      return;
    }

    alert(t.success);

    router.push(`/barber/login?lang=${lang}`);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6 border-b pb-3">
        <a
          href="https://www.flowpaydr.com"
          className="text-xl font-bold tracking-wide"
        >
          FlowPayDR
        </a>

        <div className="flex gap-2">
          <a
            href={`/register-barber?lang=es`}
            className={`px-3 py-1 rounded ${
              lang === "es" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            ES
          </a>
          <a
            href={`/register-barber?lang=en`}
            className={`px-3 py-1 rounded ${
              lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            EN
          </a>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4">{t.title}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border p-2 rounded"
          placeholder={t.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder={t.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder={t.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder={t.pin}
          onChange={(e) => setForm({ ...form, pin: e.target.value })}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder={t.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />

        <input
          className="w-full border p-2 rounded"
          placeholder={t.map}
          onChange={(e) => setForm({ ...form, map_url: e.target.value })}
        />

        <label className="block font-semibold">{t.category}</label>
        <select
          className="w-full border p-2 rounded"
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          <option value="barbershop">{t.barbershop}</option>
          <option value="independent">{t.independent}</option>
        </select>

        <label className="block font-semibold">{t.services}</label>
        <div className="grid grid-cols-2 gap-2">
          {serviceOptions.map((service) => (
            <label key={service} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.services.includes(service)}
                onChange={() => toggleService(service)}
              />
              {t.serviceLabels[service]}
            </label>
          ))}
        </div>

        <label className="block font-semibold">{t.workingDays}</label>
        <div className="grid grid-cols-3 gap-2">
          {dayOptions.map((day) => (
            <label key={day} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.working_days.includes(day)}
                onChange={() => toggleDay(day)}
              />
              {t.dayLabels[day]}
            </label>
          ))}
        </div>

        <label className="block font-semibold">{t.photo}</label>

        <div className="flex flex-col items-start gap-3">
          <label className="cursor-pointer bg-gray-200 px-4 py-2 rounded flex items-center gap-2">
            📸 {t.uploadPhoto}
            <input
              type="file"
              className="hidden"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
            />
          </label>

          {photoPreview && (
            <img
              src={photoPreview}
              alt="Preview"
              className="w-32 h-32 object-cover rounded border"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded"
        >
          {loading ? t.saving : t.submit}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500 mt-10 border-t pt-4">
        FlowPayDR © 2026 — Marketplace | Booking | Support
      </div>
    </div>
  );
}