"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Bilingual dictionary
const t = {
  es: {
    title: "Editar Perfil",
    name: "Nombre",
    email: "Correo",
    phone: "Teléfono",
    business: "Negocio",
    save: "Guardar Cambios",
    uploading: "Subiendo...",
    uploadPhoto: "Subir Foto",
    back: "Volver al Panel",
    success: "Perfil actualizado correctamente",
  },
  en: {
    title: "Edit Profile",
    name: "Name",
    email: "Email",
    phone: "Phone",
    business: "Business",
    save: "Save Changes",
    uploading: "Uploading...",
    uploadPhoto: "Upload Photo",
    back: "Back to Dashboard",
    success: "Profile updated successfully",
  },
};

export default function EditProfile() {
  const { barberId } = useParams();

  const [lang, setLang] = useState("es");
  const tr = t[lang];

  const [barber, setBarber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load barber info
  useEffect(() => {
    loadBarber();
  }, []);

  async function loadBarber() {
    const { data } = await supabase
      .from("barbers")
      .select("*, businesses(*)")
      .eq("id", barberId)
      .single();

    setBarber(data);
    setLoading(false);
  }

  // Upload photo
  async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setSaving(true);

    const fileName = `${barberId}-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("barber-photos")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      alert("Error uploading photo");
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("barber-photos")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    await supabase
      .from("barbers")
      .update({ photo_url: publicUrl })
      .eq("id", barberId);

    await loadBarber();
    setSaving(false);
  }

  // Save profile
  async function saveProfile() {
    setSaving(true);

    await supabase
      .from("barbers")
      .update({
        name: barber.name,
        email: barber.email,
        phone: barber.phone,
        business_id: barber.business_id,
      })
      .eq("id", barberId);

    alert(tr.success);
    window.location.href = `/barber/${barberId}/dashboard`;
  }
  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-xl mx-auto bg-white shadow-lg rounded-xl p-6">

        {/* Language Toggle */}
        <div className="flex justify-end mb-4 gap-2 items-center">
          <button
            className={`px-2 py-1 rounded ${lang === "es" ? "bg-black text-white" : "bg-gray-200"}`}
            onClick={() => setLang("es")}
          >
            ES
          </button>
          <button
            className={`px-2 py-1 rounded ${lang === "en" ? "bg-black text-white" : "bg-gray-200"}`}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6">{tr.title}</h1>

        {/* Photo */}
        <div className="flex flex-col items-center mb-6">
          <img
            src={barber.photo_url || "/default-barber.png"}
            alt="Barber Photo"
            className="w-28 h-28 rounded-full object-cover border shadow"
          />

          <label className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer">
            {saving ? tr.uploading : tr.uploadPhoto}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block mb-1">{tr.name}</label>
          <input
            type="text"
            className="w-full p-3 border rounded-xl"
            value={barber.name || ""}
            onChange={(e) => setBarber({ ...barber, name: e.target.value })}
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block mb-1">{tr.email}</label>
          <input
            type="email"
            className="w-full p-3 border rounded-xl"
            value={barber.email || ""}
            onChange={(e) => setBarber({ ...barber, email: e.target.value })}
          />
        </div>

        {/* Phone */}
        <div className="mb-4">
          <label className="block mb-1">{tr.phone}</label>
          <input
            type="tel"
            className="w-full p-3 border rounded-xl"
            value={barber.phone || ""}
            onChange={(e) => setBarber({ ...barber, phone: e.target.value })}
          />
        </div>

        {/* Business Name (optional) */}
        <div className="mb-4">
          <label className="block mb-1">{tr.business}</label>
          <input
            type="text"
            className="w-full p-3 border rounded-xl"
            value={barber.businesses?.name || ""}
            disabled
          />
        </div>

        {/* Save Button */}
        <button
          className="w-full bg-black text-white py-3 rounded-xl mt-4"
          onClick={saveProfile}
          disabled={saving}
        >
          {saving ? tr.uploading : tr.save}
        </button>

        {/* Back Button */}
        <button
          className="w-full bg-gray-300 text-black py-3 rounded-xl mt-3"
          onClick={() => (window.location.href = `/barber/${barberId}/dashboard`)}
        >
          {tr.back}
        </button>

      </div>
    </div>
  );
}
