"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function BarberIdPage() {
  const router = useRouter();
  const { barberId } = useParams();

  useEffect(() => {
    if (!barberId) {
      router.replace("/barber/login");   // ⭐ No ID → go to login
      return;
    }

    router.replace(`/barber/${barberId}/dashboard`);  // ⭐ Auto‑redirect to dashboard
  }, [barberId]);

  return (
    <div className="p-6">
      <p>Redirecting...</p>
    </div>
  );
}
