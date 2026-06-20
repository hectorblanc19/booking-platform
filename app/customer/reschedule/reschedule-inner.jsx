"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function RescheduleInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const secret = searchParams.get("secret");

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
      .eq("secret_link", secret)
      .single();

    if (!error) {
      setAppointment(data);
    }

    setLoading(false);
  }

  async function saveChanges() {
    if (!newDate || !newTime) {
      alert("Please select a new date and time");
      return;
    }

    const formattedTime = newTime + ":00";

    const { error } = await supabase
      .from("appointments")
      .update({
        date: newDate,
        time: formattedTime,
        status: "confirmed",
      })
      .eq("secret_link", secret);

    if (error) {
      alert("Error updating appointment");
    } else {
      alert("Appointment rescheduled");
      router.push(`/customer/${secret}`);
    }
  }

  if (loading) return <p className="p-6">Loading...</p>;
  if (!appointment) return <p className="p-6">Appointment not found.</p>;

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Reschedule Appointment</h1>

      <div className="border p-4 rounded-xl bg-white shadow-sm">
        <p><strong>Current Date:</strong> {appointment.date}</p>
        <p><strong>Current Time:</strong> {appointment.time}</p>
      </div>

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
        onClick={() => router.push(`/customer/${secret}`)}
      >
        Back
      </button>
    </div>
  );
}
