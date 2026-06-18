"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  async function login() {
    if (!email || !pin) {
      alert("Please enter email and PIN");
      return;
    }

    const { data } = await supabase
      .from("barbers")
      .select("*")
      .eq("email", email)
      .eq("pin", pin)
      .single();

    if (!data) {
      alert("Invalid email or PIN");
      return;
    }

    // ⭐ Redirect to the barber dashboard
    window.location.href = `/barber/${data.id}/dashboard`;
  }

  return (
    <div className="max-w-sm mx-auto p-6 mt-20">
      <h1 className="text-3xl font-bold mb-6">Panel de Barbería</h1>

      <label className="block mb-1">Email</label>
      <input
        type="email"
        className="w-full p-3 border rounded-xl mb-4"
        onChange={(e) => setEmail(e.target.value)}
      />

      <label className="block mb-1">PIN</label>
      <input
        type="password"
        className="w-full p-3 border rounded-xl mb-4"
        onChange={(e) => setPin(e.target.value)}
      />

      <button
        className="w-full bg-blue-600 text-white py-3 rounded-xl"
        onClick={login}
      >
        Entrar
      </button>
    </div>
  );
}
