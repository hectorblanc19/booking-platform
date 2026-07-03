"use client";

import { useEffect } from "react";

export default function PushManager({ userId, role }) {
  useEffect(() => {
    async function setupPush() {
      if (!("serviceWorker" in navigator)) return;
      if (!("PushManager" in window)) return;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      // ⭐ Use the existing Next.js service worker
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      // ⭐ Correct endpoint
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role,
          subscription,
        }),
      });

      console.log("Push subscription saved!");
    }

    setupPush();
  }, [userId, role]);

  return null;
}
