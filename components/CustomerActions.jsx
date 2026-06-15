"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CustomerActions({ customerId }) {
  async function cancelAppointment() {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("customer_id", customerId);

    if (error) {
      alert("Failed to cancel appointment");
    } else {
      alert("Appointment canceled");
      window.location.reload();
    }
  }

  function goToReschedule() {
    window.location.href = `/customer/reschedule/${customerId}`;
  }

  return (
    <div className="mt-3">
      <button
        onClick={cancelAppointment}
        className="px-3 py-1 bg-red-500 text-white rounded"
      >
        Cancel
      </button>

      <button
        onClick={goToReschedule}
        className="ml-2 px-3 py-1 bg-blue-500 text-white rounded"
      >
        Reschedule
      </button>
    </div>
  );
}
