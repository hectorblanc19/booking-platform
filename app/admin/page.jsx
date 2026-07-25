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
  const [newBusinessPhone, setNewBusinessPhone] = useState("");
  const [newBusinessAddress, setNewBusinessAddress] = useState("");

  // ⭐ NEW BUSINESS HOURS
  const [newBusinessOpen, setNewBusinessOpen] = useState("");
  const [newBusinessClose, setNewBusinessClose] = useState("");

  const [newBarberName, setNewBarberName] = useState("");
  const [newBarberEmail, setNewBarberEmail] = useState("");
  const [newBarberBusiness, setNewBarberBusiness] = useState("");
// ⭐ NEW — Barber Address
const [newBarberAddress, setNewBarberAddress] = useState("");
 const [editingBarber, setEditingBarber] = useState(null);

 // ⭐ NEW STATES
  const [newBarberPhone, setNewBarberPhone] = useState("");
  const [newBarberWorkingDays, setNewBarberWorkingDays] = useState([]);

  // Search / filter
  const [businessSearch, setBusinessSearch] = useState("");
  const [barberSearch, setBarberSearch] = useState("");
  const [appointmentBusinessFilter, setAppointmentBusinessFilter] = useState("");
  const [appointmentBarberFilter, setAppointmentBarberFilter] = useState("");

  // Notifications
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);
// ⭐ LOAD ALL — FIXED VERSION
async function loadAll() {
  setLoading(true);

  const { data: biz } = await supabase.from("businesses").select("*");

  const { data: bar } = await supabase
    .from("barbers")
    .select(`
      id,
      name,
      email,
      phone,
      address,
      business_id,
      working_days,
      payment_status,
      businesses:business_id(name)
    `);

  const { data: appt } = await supabase
    .from("appointments")
    .select(`
      *,
      barbers:barber_id(name),
      businesses:business_id(name)
    `)
    .order("date", { ascending: false });

  setBusinesses(biz || []);
  setBarbers(bar || []);
  setAppointments(appt || []);

  setLoading(false);
}

  
  function showMessage(type, text) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  // ⭐ Add Business (UPDATED WITH OPEN/CLOSE TIME)
  async function addBusiness() {
    if (!newBusiness) return alert("Enter business name");

    const { error } = await supabase.from("businesses").insert({
      name: newBusiness,
      phone: newBusinessPhone,
      address: newBusinessAddress,
      owner_id: null,
      open_time: newBusinessOpen,
      close_time: newBusinessClose,
    });

    if (error) {
      console.error("Error adding business:", error);
      showMessage("error", "Error adding business: " + error.message);
      return;
    }

    setNewBusiness("");
    setNewBusinessPhone("");
    setNewBusinessAddress("");
    setNewBusinessOpen("");
    setNewBusinessClose("");

    showMessage("success", "Business added");
    loadAll();
  }

  // ⭐ UPDATED Add Barber — supports independent barbers
  async function addBarber() {
    if (!newBarberName || !newBarberEmail || !newBarberBusiness)
      return alert("Fill all fields");

    // ⭐ Convert "none" → null
    const businessValue =
      newBarberBusiness === "none" ? null : newBarberBusiness;

    const { error } = await supabase.from("barbers").insert({
  name: newBarberName,
  email: newBarberEmail,
  business_id: businessValue,
  phone: newBarberPhone,
  address: newBarberAddress,   // ⭐ REQUIRED
  working_days: newBarberWorkingDays,
});

    if (error) {
      console.error("Error adding barber:", error);
      showMessage("error", "Error adding barber: " + error.message);
      return;
    }

    setNewBarberName("");
    setNewBarberEmail("");
    setNewBarberBusiness("");
    setNewBarberPhone("");
    setNewBarberWorkingDays([]);

    showMessage("success", "Barber added");
    loadAll();
  }

  // ⭐ Delete Business
  async function deleteBusiness(id) {
    if (!confirm("Delete this business?")) return;
    const { error } = await supabase.from("businesses").delete().eq("id", id);
    if (error) {
      console.error("Error deleting business:", error);
      showMessage("error", "Error deleting business: " + error.message);
      return;
    }
    showMessage("success", "Business deleted");
    loadAll();
  }

  // ⭐ Delete Barber
  async function deleteBarber(id) {
    if (!confirm("Delete this barber?")) return;
    const { error } = await supabase.from("barbers").delete().eq("id", id);
    if (error) {
      console.error("Error deleting barber:", error);
      showMessage("error", "Error deleting barber: " + error.message);
      return;
    }
    showMessage("success", "Barber deleted");
    loadAll();
  }

  // ⭐ Block Barber
  async function blockBarber(id) {
    const { error } = await supabase
      .from("barbers")
      .update({ payment_status: "unpaid" })
      .eq("id", id);

    if (error) {
      console.error("Error blocking barber:", error);
      showMessage("error", "Error blocking barber: " + error.message);
      return;
    }

    showMessage("success", "Barber blocked");
    loadAll();
  }

 // ⭐ Unblock Barber
async function unblockBarber(id) {
  const { error } = await supabase
    .from("barbers")
    .update({ payment_status: "paid" })
    .eq("id", id);

  if (error) {
    console.error("Error unblocking barber:", error);
    showMessage("error", "Error unblocking barber: " + error.message);
    return;
  }

  showMessage("success", "Barber unblocked");
  loadAll();
}

// ⭐ Save Barber Edit (FINAL FIX)
async function saveBarberEdit() {
  const { id, name, phone, address, map_url } = editingBarber;

  const { error } = await supabase
    .from("barbers")
    .update({ name, phone, address, map_url })
    .eq("id", id);

  if (error) {
    console.error("Error updating barber:", error);
    showMessage("error", "Error updating barber: " + error.message);
    return;
  }

  showMessage("success", "Barber updated");
  setEditingBarber(null);
  loadAll();
}

if (loading) return <p className="p-6">Loading admin panel...</p>;


  // Filtered lists
  const filteredBusinesses = businesses.filter((b) =>
    b.name.toLowerCase().includes(businessSearch.toLowerCase())
  );

  const filteredBarbers = barbers.filter((b) =>
    b.name.toLowerCase().includes(barberSearch.toLowerCase())
  );

  const filteredAppointments = appointments.filter((a) => {
    const byBusiness =
      !appointmentBusinessFilter || a.businesses?.name === appointmentBusinessFilter;
    const byBarber =
      !appointmentBarberFilter || a.barbers?.name === appointmentBarberFilter;
    return byBusiness && byBarber;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FlowPayDR Admin</h1>
          <p className="text-gray-600 text-sm">
            Control center for businesses, barbers, and appointments.
          </p>
        </div>
      </header>

      <div className="mt-4">
        <a
          href="/admin/payments"
          className="text-blue-600 underline font-semibold"
        >
          Go to Payment Dashboard
        </a>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white shadow-sm rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500">Businesses</p>
          <p className="text-2xl font-semibold mt-1">{businesses.length}</p>
        </div>
        <div className="p-4 bg-white shadow-sm rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500">Barbers</p>
          <p className="text-2xl font-semibold mt-1">{barbers.length}</p>
        </div>
        <div className="p-4 bg-white shadow-sm rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500">Appointments</p>
          <p className="text-2xl font-semibold mt-1">{appointments.length}</p>
        </div>
      </section>

      {/* Businesses */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Businesses</h2>
          <input
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white"
            placeholder="Search businesses..."
            value={businessSearch}
            onChange={(e) => setBusinessSearch(e.target.value)}
          />
        </div>

        {/* Add Business Form */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <input
              className="border border-gray-300 p-2 rounded-lg text-sm"
              placeholder="Business name"
              value={newBusiness}
              onChange={(e) => setNewBusiness(e.target.value)}
            />
            <input
              className="border border-gray-300 p-2 rounded-lg text-sm"
              placeholder="Phone"
              value={newBusinessPhone}
              onChange={(e) => setNewBusinessPhone(e.target.value)}
            />
            <input
              className="border border-gray-300 p-2 rounded-lg text-sm"
              placeholder="Address"
              value={newBusinessAddress}
              onChange={(e) => setNewBusinessAddress(e.target.value)}
            />
          </div>

          {/* ⭐ NEW BUSINESS HOURS INPUTS */}
          <div className="grid grid-cols-2 gap-3">
            <input
              className="border border-gray-300 p-2 rounded-lg text-sm"
              type="time"
              value={newBusinessOpen}
              onChange={(e) => setNewBusinessOpen(e.target.value)}
              placeholder="Opening Time"
            />

            <input
              className="border border-gray-300 p-2 rounded-lg text-sm"
              type="time"
              value={newBusinessClose}
              onChange={(e) => setNewBusinessClose(e.target.value)}
              placeholder="Closing Time"
            />
          </div>

          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
            onClick={addBusiness}
          >
            Add Business
          </button>
        </div>

        {/* Business List */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-2">
          {filteredBusinesses.map((b) => (
            <div
              key={b.id}
              className="flex justify-between items-center border-b last:border-none py-2"
            >
              <div>
                <p className="font-semibold text-sm">{b.name}</p>

                {b.phone && (
                  <p className="text-xs text-gray-600">Phone: {b.phone}</p>
                )}

                {b.address && (
                  <p className="text-xs text-gray-600">Address: {b.address}</p>
                )}

                {/* ⭐ SHOW BUSINESS HOURS */}
                {b.open_time && b.close_time && (
                  <p className="text-xs text-gray-600">
                    Hours: {b.open_time} - {b.close_time}
                  </p>
                )}
              </div>

              <button
                className="text-red-600 text-sm"
                onClick={() => deleteBusiness(b.id)}
              >
                Delete
              </button>
            </div>
          ))}

          {filteredBusinesses.length === 0 && (
            <p className="text-xs text-gray-500">No businesses found.</p>
          )}
        </div>
      </section>

      {/* ⭐ BARBERS SECTION ⭐ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Barbers</h2>
          <input
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white"
            placeholder="Search barbers..."
            value={barberSearch}
            onChange={(e) => setBarberSearch(e.target.value)}
          />
        </div>

        {/* Add Barber Form */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-3">

          {/* 3-column row */}
          <div className="grid grid-cols-3 gap-3">
            <input
              className="border border-gray-300 p-2 rounded-lg text-sm"
              placeholder="Barber name"
              value={newBarberName}
              onChange={(e) => setNewBarberName(e.target.value)}
            />

            <input
              className="border border-gray-300 p-2 rounded-lg text-sm"
              placeholder="Barber email"
              value={newBarberEmail}
              onChange={(e) => setNewBarberEmail(e.target.value)}
            />

            <select
              className="border border-gray-300 p-2 rounded-lg text-sm bg-white"
              value={newBarberBusiness}
              onChange={(e) => setNewBarberBusiness(e.target.value)}
            >
              <option value="">Select business</option>

              {/* ⭐ Independent Barber Option */}
              <option value="none">Independent Barber</option>

              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phone Number */}
          <input
            className="border border-gray-300 p-2 rounded-lg text-sm w-full"
            placeholder="Phone number"
            value={newBarberPhone}
            onChange={(e) => setNewBarberPhone(e.target.value)}
          />

{/* Barber Address */}
<input
  className="border border-gray-300 p-2 rounded-lg text-sm w-full"
  placeholder="Address"
  value={newBarberAddress}
  onChange={(e) => setNewBarberAddress(e.target.value)}
/>


          {/* Working Days */}
          <div>
            <p className="text-sm font-semibold mb-1">Working Days</p>

            <div className="grid grid-cols-4 gap-2 text-sm">
              {["mon","tue","wed","thu","fri","sat","sun"].map((day) => (
                <label key={day} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newBarberWorkingDays.includes(day)}
                    onChange={() => {
                      if (newBarberWorkingDays.includes(day)) {
                        setNewBarberWorkingDays(
                          newBarberWorkingDays.filter((d) => d !== day)
                        );
                      } else {
                        setNewBarberWorkingDays([...newBarberWorkingDays, day]);
                      }
                    }}
                  />
                  {day.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <button
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
            onClick={addBarber}
          >
            Add Barber
          </button>
        </div>

        {/* Barber List */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-2">
          {filteredBarbers.map((b) => (
            <div
              key={b.id}
              className="flex justify-between items-center border-b last:border-none py-2"
            >
              <div>
                <p className="font-semibold text-sm">{b.name}</p>
                <p className="text-xs text-gray-600">{b.email}</p>

                {b.phone && (
                  <p className="text-xs text-gray-600">Phone: {b.phone}</p>
                )}

                {b.working_days && (
                  <p className="text-xs text-gray-600">
                    Days: {b.working_days.join(", ").toUpperCase()}
                  </p>
                )}

                <p className="text-xs text-gray-600">
                  Business: {b.businesses?.name || "Independent"}
                </p>

                {/* STATUS BADGE */}
                {b.payment_status === "unpaid" ? (
                  <span className="inline-block mt-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                    BLOCKED
                  </span>
                ) : (
                  <span className="inline-block mt-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                    ACTIVE
                  </span>
                )}
              </div>

              {/* BUTTONS */}
<div className="flex gap-3">

  {/* EDIT BARBER */}
  <button
    className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
    onClick={() => setEditingBarber(b)}
  >
    Edit
  </button>

  {/* BLOCK BARBER */}
  {b.payment_status !== "unpaid" && (
    <button
      className="bg-red-600 text-white px-3 py-1 rounded text-xs"
      onClick={() => blockBarber(b.id)}
    >
      Block
    </button>
  )}

  {/* UNBLOCK BARBER */}
  {b.payment_status === "unpaid" && (
    <button
      className="bg-green-600 text-white px-3 py-1 rounded text-xs"
      onClick={() => unblockBarber(b.id)}
    >
      Unblock
    </button>
  )}

  {/* DELETE */}
  <button
    className="text-red-600 text-sm"
    onClick={() => deleteBarber(b.id)}
  >
    Delete
  </button>

</div>
</div>
))}

{filteredBarbers.length === 0 && (
  <p className="text-xs text-gray-500">No barbers found.</p>
)}
</div>
</section>

{/* Appointments */}
<section className="space-y-4">
  <div className="flex items-center justify-between">
    <h2 className="text-xl font-semibold">Appointments</h2>
    <div className="flex gap-2">
      <select
        className="border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white"
        value={appointmentBusinessFilter}
        onChange={(e) => setAppointmentBusinessFilter(e.target.value)}
      >
        <option value="">All businesses</option>
        {businesses.map((b) => (
          <option key={b.id} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>

      <select
        className="border border-gray-300 rounded-lg px-3 py-1 text-sm bg-white"
        value={appointmentBarberFilter}
        onChange={(e) => setAppointmentBarberFilter(e.target.value)}
      >
        <option value="">All barbers</option>
        {barbers.map((b) => (
          <option key={b.id} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  </div>

  <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 space-y-2">
    {filteredAppointments.map((a) => (
      <div
        key={a.id}
        className="border-b last:border-none py-3 text-sm"
      >
        <p className="font-semibold">
          {a.date} at {a.time}
        </p>
        <p>
          {a.customer_name} — {a.service}
        </p>
        <p className="text-xs text-gray-600">
          Barber: {a.barbers?.name} | Business: {a.businesses?.name}
        </p>
      </div>
    ))}

    {filteredAppointments.length === 0 && (
      <p className="text-xs text-gray-500">No appointments found.</p>
    )}
  </div>
</section>

{/* ⭐ EDIT BARBER MODAL ⭐ */}
      {editingBarber && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-96 space-y-3 shadow-lg">
            <h3 className="text-lg font-semibold">Edit Barber</h3>

            {/* Name */}
            <input
              className="border p-2 rounded w-full"
              value={editingBarber.name || ""}
              onChange={(e) =>
                setEditingBarber({
                  ...editingBarber,
                  name: e.target.value,
                })
              }
            />

            {/* Phone */}
            <input
              className="border p-2 rounded w-full"
              value={editingBarber.phone || ""}
              onChange={(e) =>
                setEditingBarber({
                  ...editingBarber,
                  phone: e.target.value,
                })
              }
            />

            {/* Address */}
            <input
              className="border p-2 rounded w-full"
              value={editingBarber.address || ""}
              onChange={(e) =>
                setEditingBarber({
                  ...editingBarber,
                  address: e.target.value,
                })
              }
            />

            {/* ⭐ Google Maps Pin URL */}
            <input
              className="border p-2 rounded w-full"
              placeholder="Google Maps URL (Pin)"
              value={editingBarber.map_url || ""}
              onChange={(e) =>
                setEditingBarber({
                  ...editingBarber,
                  map_url: e.target.value,
                })
              }
            />

            <button
              className="bg-green-600 text-white px-4 py-2 rounded w-full"
              onClick={saveBarberEdit}
            >
              Save Changes
            </button>

            <button
              className="text-red-600 text-sm w-full mt-2"
              onClick={() => setEditingBarber(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}