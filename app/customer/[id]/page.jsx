"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import StatusBadge from "@/components/StatusBadge";
import CustomerActions from "@/components/CustomerActions";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CustomerDashboard() {
  const { id: customerId } = useParams();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load appointments
  async function loadAppointments() {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("customer_id", customerId)
      .order("date", { ascending: true });

    if (!error) {
      setAppointments(data);
    }

    setLoading(false);
  }

  // Realtime listener
  useEffect(() => {
    loadAppointments();

    const channel = supabase
      .channel("customer-appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `customer_id=eq.${customerId}`,
        },
        () => {
          loadAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId]);

  if (loading) return <p className="p-6">Loading...</p>;

  if (!appointments || appointments.length === 0) {
    return <div className="p-6">No appointments found.</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Appointments</h1>

      {appointments.map((appt) => (
        <div key={appt.id} className="border p-4 rounded mb-3">
          <p><strong>Service:</strong> {appt.service}</p>
          <p><strong>Barber:</strong> {appt.barber}</p>
          <p><strong>Date:</strong> {appt.date}</p>
          <p><strong>Time:</strong> {appt.time}</p>

          <StatusBadge status={appt.status} />

          <CustomerActions customerId={appt.customer_id} />
        </div>
      ))}
    </div>
  );
}
