"use client";

import { useEffect } from "react";

export default function GetUserLocation({ onLocation }) {
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        console.log("GPS blocked or unavailable");
      }
    );
  }, []);

  return null;
}
