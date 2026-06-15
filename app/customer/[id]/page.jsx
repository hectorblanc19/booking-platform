import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function CustomerDashboard({ params }) {
  const customerId = params.id; // FIXED

  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("customer_id", customerId)
    .order("date", { ascending: true });

  if (!data || data.length === 0) {
    return <div>No appointments found.</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Appointments</h1>

      {data.map((appt) => (
        <div key={appt.id} className="border p-4 rounded mb-3">
          <p><strong>Service:</strong> {appt.service}</p>
          <p><strong>Barber:</strong> {appt.barber}</p>
          <p><strong>Date:</strong> {appt.date}</p>
          <p><strong>Time:</strong> {appt.time}</p>

          <button className="mt-2 px-3 py-1 bg-red-500 text-white rounded">
            Cancel
          </button>

          <button className="mt-2 ml-2 px-3 py-1 bg-blue-500 text-white rounded">
            Reschedule
          </button>
        </div>
      ))}
    </div>
  );
}
