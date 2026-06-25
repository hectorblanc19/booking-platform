// force rebuild 8
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function BarberLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  async function subscribeToPush(barberId) {
    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // Save subscription to Supabase
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

  async function loginBarber() {
    if (!email || !pin) {
      alert("Enter email and PIN");
      return;
    }

    const { data: barber } = await supabase
      .from("barbers")
      .select("*")
      .eq("email", email)
      .eq("pin", pin)
      .single();

    if (!barber) {
      alert("Invalid login");
      return;
    }

    // ⭐ Save identity for push notifications
    localStorage.setItem("flowpay_role", "barber");
    localStorage.setItem("flowpay_user_id", barber.id);

    // ⭐ Create push subscription BEFORE redirect
    await subscribeToPush(barber.id);

    // ⭐ Redirect to the REAL dashboard
    router.push(`/barber/${barber.id}/dashboard`);
  }

  return (
    <div className="max-w-sm mx-auto p-6 mt-20">
      <h1 className="text-2xl font-bold mb-6 text-center">Barber Login</h1>

      <input
        className="w-full border p-3 rounded mb-3"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="w-full border p-3 rounded mb-3"
        placeholder="PIN"
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />

      <button
        className="w-full bg-black text-white py-3 rounded-xl"
        onClick={loginBarber}
      >
        Login
      </button>
    </div>
  );
}
