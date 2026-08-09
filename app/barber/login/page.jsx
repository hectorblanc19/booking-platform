"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function BarberLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [lang, setLang] = useState("en");

  // Detect browser language
  useEffect(() => {
    const browserLang = navigator.language.startsWith("es") ? "es" : "en";
    setLang(browserLang);
  }, []);

  const t = {
    en: {
      title: "Barber Login",
      email: "Email",
      pin: "PIN",
      login: "Login",
      empty: "Enter email and PIN",
      invalid: "Invalid login",
      loading: "Logging in...",
      show: "Show",
      hide: "Hide",
    },
    es: {
      title: "Inicio de Barbero",
      email: "Correo",
      pin: "PIN",
      login: "Entrar",
      empty: "Ingresa correo y PIN",
      invalid: "Login inválido",
      loading: "Entrando...",
      show: "Mostrar",
      hide: "Ocultar",
    },
  };

  async function subscribeToPush(barberId) {
    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      await supabase.from("push_tokens").upsert({
        user_id: barberId,
        role: "barber",
        subscription: subscription.toJSON(),
      });

      console.log("Push subscription saved!");
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  }

useEffect(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
  }
}, []);

async function loginBarber() {
  setError("");

  if (!email.trim() || !pin.trim()) {
    setError(t[lang].empty);
    return;
  }

  setLoading(true);

  try {
    const { data: barber, error: loginError } = await supabase
      .from("barbers")
      .select("*")
      .ilike("email", email.trim())
      .eq("pin", pin.trim())
      .single();

    if (loginError || !barber) {
      setLoading(false);
      setError(t[lang].invalid);
      return;
    }

    localStorage.setItem("flowpay_role", "barber");
    localStorage.setItem("flowpay_user_id", barber.id);

    // ❌ REMOVE THIS — causes iPhone freeze
    // await subscribeToPush(barber.id);

    router.push(`/barber/${barber.id}/dashboard`);
  } catch (err) {
    console.error("Login failed:", err);
    setLoading(false);
    setError(t[lang].invalid);
  }
}

  return (
    <div className="max-w-sm mx-auto p-6 mt-20">

      {/* ES / EN side-by-side toggle */}
      <div className="flex justify-end gap-4 mb-4">
        <span
          className={`cursor-pointer ${
            lang === "es" ? "font-bold text-black" : "text-gray-500"
          }`}
          onClick={() => setLang("es")}
        >
          ES
        </span>

        <span
          className={`cursor-pointer ${
            lang === "en" ? "font-bold text-black" : "text-gray-500"
          }`}
          onClick={() => setLang("en")}
        >
          EN
        </span>
      </div>

      <h1 className="text-2xl font-bold mb-6 text-center">{t[lang].title}</h1>

      <div className="space-y-4">
        <div>
          <input
            className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black/50"
            placeholder={t[lang].email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="relative">
          <input
            className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-black/50"
            placeholder={t[lang].pin}
            type={showPin ? "text" : "password"}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />

          <button
            type="button"
            className="absolute right-3 top-3 text-sm text-gray-600"
            onClick={() => setShowPin(!showPin)}
          >
            {showPin ? t[lang].hide : t[lang].show}
          </button>
        </div>

        {error && (
          <p className="text-red-600 text-sm font-medium">{error}</p>
        )}

        <button
          className={`w-full bg-black text-white py-3 rounded-xl transition-all ${
            loading ? "opacity-70" : "hover:bg-black/90"
          }`}
          onClick={loginBarber}
          disabled={loading}
        >
          {loading ? t[lang].loading : t[lang].login}
        </button>
      </div>
    </div>
  );
}
