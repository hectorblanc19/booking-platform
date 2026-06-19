"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPanel() {
  const [businesses, setBusinesses] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);

  // Form states
  const [newBusiness, setNewBusiness] = useState("");
  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberEmail, setNewBarberEmail] = useState("");
  const [newBarberBusiness, setNewBarberBusiness] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);

    const { data: biz } = await supabase.from("businesses").select("*");
    const { data: bar } = await supabase.from("barbers").select("*, businesses(*)");
    const { data: appt } = await supabase
      .from("appointments")
      .select("*, barbers(name), businesses(name)")
      .order("date", { ascending: false });

    setBusinesses(biz || []);
    setBarbers(bar || []);
    setAppointments(appt || []);

    setLoading(false);
  }

  // ⭐ Add Business
  async function addBusiness() {
    if (!newBusiness) return alert("Enter business name");

    await supabase.from("businesses").insert({ name: newBusiness });
    setNewBusiness("");
    loadAll();
  }

  // ⭐ Add Barber
  async function addBarber() {
    if (!newBarberName || !newBarberEmail || !newBarberBusiness)
      return alert("Fill all fields");

    await supabase.from("barbers").insert({
      name: newBarberName,
      email: newBarberEmail,
      business_id: newBarberBusiness,
    });

    setNewBarberName("");
    setNewBarberEmail("");
    setNewBarberBusiness("");
    loadAll();
  }

  // ⭐ Delete Business
  async function deleteBusiness(id) {
    if (!confirm("Delete this business?")) return;
    await supabase.from("businesses").delete().eq("id", id);
    loadAll();
  }

  // ⭐ Delete Barber
  async function deleteBarber(id) {
    if (!confirm("Delete this barber?")) return;
    await supabase.from("barbers").delete().eq("id", id);
    loadAll();
  }

  if (loading) return <p className="p-6">Loading admin panel...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">FlowPayDR Admin Panel</h1>

      {/* BUSINESSES */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">Businesses</h2>

        <div className="flex gap-2 mb-4">
          <input
            className="border p-2 rounded w-full"
            placeholder="New business name"
            value={newBusiness}
            onChange={(e) => setNewBusiness(e.target.value)}
          />
          <button
            className="bg-green-600 text-white px-4 rounded"
            onClick={addBusiness}
          >
            Add
          </button>
        </div>

        <div className="border rounded-xl p-4 bg-white shadow">
          {businesses.map((b) => (
            <div
              key={b.id}
              className="flex justify-between border-b py-2 last:border-none"
            >
              <span>{b.name}</span>
              <button
                className="text-red-600"
                onClick={() => deleteBusiness(b.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* BARBERS */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-3">Barbers</h2>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <input
            className="border p-2 rounded"
            placeholder="Barber name"
            value={newBarberName}
            onChange={(e) => setNewBarberName(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Barber email"
            value={newBarberEmail}
            onChange={(e) => setNewBarberEmail(e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={newBarberBusiness}
            onChange={(e) => setNewBarberBusiness(e.target.value)}
          >
            <option value="">Select business</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <button
          className="bg-green-600 text-white px-4 py-2 rounded mb-4"
          onClick={addBarber}
        >
          Add Barber
        </button>

        <div className="border rounded-xl p-4 bg-white shadow">
          {barbers.map((b) => (
            <div
              key={b.id}
              className="flex justify-between border-b py-2 last:border-none"
            >
              <span>
                {b.name} — {b.businesses?.name}
              </span>
              <button
                className="text-red-600"
                onClick={() => deleteBarber(b.id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* APPOINTMENTS */}
      <section>
        <h2 className="text-2xl font-semibold mb-3">Appointments</h2>

        <div className="border rounded-xl p-4 bg-white shadow">
          {appointments.map((a) => (
            <div
              key={a.id}
              className="border-b py-3 last:border-none text-sm"
            >
              <p>
                <strong>{a.date}</strong> at <strong>{a.time}</strong>
              </p>
              <p>
                {a.customer_name} — {a.service}
              </p>
              <p>
                Barber: {a.barbers?.name} | Business: {a.businesses?.name}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
