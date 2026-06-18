"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ReschedulePage() {
  const { barberId, id } = useParams(); // FIXED

  const [appointment, setAppointment] = useState(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAppointment();
  }, []);

  async function loadAppointment() {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error loading appointment:", error);
      alert("Error loading appointment: " + error.message);
      return;
    }

    setAppointment(data);
    setLoading(false);
  }

  async function saveChanges() {
    if (!newDate || !newTime) {
      alert("Select date and time");
      return;
    }

    const formattedTime = newTime + ":00";

    const { error } = await supabase
      .from("appointments")
      .update({
        date: newDate,
        time: formattedTime,
      })
      .eq("id", id);

    if (error) {
      console.error("UPDATE ERROR:", error);
      alert("Update failed: " + error.message);
    } else {
      // Redirect back to dashboard with fresh reload
      window.location.href = `/barber/${barberId}/dashboard?refresh=${Date.now()}`;
    }
  }

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Reschedule Appointment</h1>

      <p><strong>Current Date:</strong> {appointment.date}</p>
      <p><strong>Current Time:</strong> {appointment.time}</p>

      <div className="mt-4">
        <label className="block mb-1">New Date</label>
        <input
          type="date"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setNewDate(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className="block mb-1">New Time</label>
        <input
          type="time"
          className="w-full p-3 border rounded-xl"
          onChange={(e) => setNewTime(e.target.value)}
        />
      </div>

      <button
        className="mt-6 w-full bg-green-600 text-white py-3 rounded-xl"
        onClick={saveChanges}
      >
        Save Changes
      </button>

      <button
        className="mt-3 w-full bg-gray-300 py-3 rounded-xl"
        onClick={() => window.history.back()}
      >
        Back
      </button>
    </div>
  );
}
