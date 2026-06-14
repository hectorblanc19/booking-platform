"use client";

import { useState } from "react";

const t = {
  es: {
    title: "Tu Información",
    nameLabel: "Nombre Completo *",
    namePlaceholder: "Juan Pérez",
    phoneLabel: "Teléfono (WhatsApp) *",
    phonePlaceholder: "+1 829 555 1234",
    emailLabel: "Correo (opcional)",
    emailPlaceholder: "correo@ejemplo.com",
    notesLabel: "Notas (opcional)",
    notesPlaceholder: "¿Algo que debamos saber?",
    requiredAlert: "Nombre y teléfono son requeridos",
    continue: "Continuar",
  },
  en: {
    title: "Your Information",
    nameLabel: "Full Name *",
    namePlaceholder: "John Doe",
    phoneLabel: "Phone (WhatsApp) *",
    phonePlaceholder: "+1 561 555 1234",
    emailLabel: "Email (optional)",
    emailPlaceholder: "example@email.com",
    notesLabel: "Notes (optional)",
    notesPlaceholder: "Anything we should know?",
    requiredAlert: "Name and phone are required",
    continue: "Continue",
  },
};

export default function CustomerForm({ onSubmit, lang }) {
  const tr = t[lang];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !phone) {
      alert(tr.requiredAlert);
      return;
    }

    onSubmit({
      name,
      phone,
      email,
      notes,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 p-4 border rounded-xl bg-white shadow-sm space-y-4"
    >
      <h2 className="text-xl font-semibold">{tr.title}</h2>

      {/* NAME */}
      <div>
        <label className="block text-sm font-medium mb-1">{tr.nameLabel}</label>
        <input
          type="text"
          className="w-full p-3 border rounded-xl"
          placeholder={tr.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* PHONE */}
      <div>
        <label className="block text-sm font-medium mb-1">{tr.phoneLabel}</label>
        <input
          type="tel"
          className="w-full p-3 border rounded-xl"
          placeholder={tr.phonePlaceholder}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>

      {/* EMAIL */}
      <div>
        <label className="block text-sm font-medium mb-1">{tr.emailLabel}</label>
        <input
          type="email"
          className="w-full p-3 border rounded-xl"
          placeholder={tr.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* NOTES */}
      <div>
        <label className="block text-sm font-medium mb-1">{tr.notesLabel}</label>
        <textarea
          className="w-full p-3 border rounded-xl"
          placeholder={tr.notesPlaceholder}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* SUBMIT */}
      <button
        type="submit"
        className="w-full bg-black text-white py-3 rounded-xl text-lg"
      >
        {tr.continue}
      </button>
    </form>
  );
}
