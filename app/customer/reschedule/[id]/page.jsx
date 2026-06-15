"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CustomerReschedulePage() {
  const { id } = useParams();

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
      .eq("customer_id", id)
      .single();

    if (error) {
      console.error("Error loading appointment:", error);
      return;
    }

    setAppointment(data);
    setLoading(false);
  }

  async function saveChanges() {
    if (!newDate || !newTime) {
      alert("Please select a new date and time");
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({
        date: newDate,
        time: newTime,
        status: "rescheduled",
      })
      .eq("customer_id", id);

    if (error) {
      alert("Error updating appointment");
    } else {
      alert("Appointment rescheduled!");
      window.location.href = `/customer/${id}`;
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
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl"
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
