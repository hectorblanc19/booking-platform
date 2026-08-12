"use client";

import { useEffect } from "react";

// Convert Base64 VAPID key → Uint8Array (required by browsers)
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * ⭐ FIXED VERSION
 * This component now receives:
 * - role: "customer" or "business"
 * - secret_link: for customers
 * - barber_id: for barbers
 */
export default function ServiceWorkerClient({
  role,
  secret_link,
  barber_id,
}: {
  role: "customer" | "business";
  secret_link?: string;
  barber_id?: string;
}) {
  useEffect(() => {
  if (role === "business") return;   // ⭐ DO NOT register SW for barbers
  async function setup() {
      if (!("serviceWorker" in navigator)) return;
      if (!("PushManager" in window)) return;

      // Register service worker
      const registration = await navigator.serviceWorker.register("/service-worker.js");
      console.log("SW registered:", registration);

      // Ask for notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Notification permission not granted");
        return;
      }

      // Convert VAPID key → Uint8Array
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      console.log("Subscribed:", subscription);

      // ⭐ FIX: Send correct ID depending on role
      let payload: any = {
        role,
        subscription,
      };

      if (role === "customer") {
        payload.secret_link = secret_link; // ⭐ MUST MATCH booking route
      }

      if (role === "business") {
        payload.barber_id = barber_id; // ⭐ MUST MATCH barbers.id
      }

      // Save subscription to backend
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Subscription saved to backend");
    }

    setup().catch((err) => console.error("Push setup failed:", err));
  }, [role, secret_link, barber_id]);

  return null;
}
