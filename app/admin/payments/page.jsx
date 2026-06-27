"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPayments() {
  const [barbers, setBarbers] = useState([]);
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const { data: barberData } = await supabase
      .from("barbers")
      .select("id, name, monthly_fee, last_payment_date, payment_status");

    const { data: businessData } = await supabase
      .from("businesses")
      .select("id, name, monthly_fee, last_payment_date, payment_status");

    // Apply overdue detection
    const updatedBarbers = applyOverdue(barberData || []);
    const updatedBusinesses = applyOverdue(businessData || []);

    // Sort unpaid first
    setBarbers(sortByStatus(updatedBarbers));
    setBusinesses(sortByStatus(updatedBusinesses));
  };

  // ⭐ Auto-overdue detection
  const applyOverdue = (items) => {
    const today = new Date();

    return items.map((item) => {
      if (!item.last_payment_date) {
        return { ...item, payment_status: "never" };
      }

      const last = new Date(item.last_payment_date);
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

      if (diffDays > 30) {
        return { ...item, payment_status: "overdue" };
      }

      return { ...item, payment_status: "paid" };
    });
  };

  // ⭐ Sorting: unpaid first
  const sortByStatus = (items) => {
    const order = { overdue: 0, never: 1, paid: 2 };
    return items.sort((a, b) => order[a.payment_status] - order[b.payment_status]);
  };

  // ⭐ Mark Paid
  const markPaid = async (table, id) => {
    await supabase
      .from(table)
      .update({
        last_payment_date: new Date().toISOString().split("T")[0],
        payment_status: "paid",
      })
      .eq("id", id);

    loadPayments();
  };

  // ⭐ Format date
  const formatDate = (date) => {
    if (!date) return "Never";
    return new Date(date).toISOString().split("T")[0];
  };

  // ⭐ Badge component
  const StatusBadge = ({ status }) => {
    if (status === "paid")
      return <span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs">PAID</span>;

    if (status === "overdue")
      return <span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs">OVERDUE</span>;

    return <span className="text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs">NEVER PAID</span>;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Payment Dashboard</h1>

      {/* Businesses */}
      <h2 className="text-2xl font-semibold mt-6 mb-3">Businesses</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Name</th>
            <th className="p-2">Monthly Fee</th>
            <th className="p-2">Last Payment</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="p-2">{b.name}</td>
              <td className="p-2">${b.monthly_fee}</td>
              <td className="p-2">{formatDate(b.last_payment_date)}</td>
              <td className="p-2 font-bold">
                <StatusBadge status={b.payment_status} />
              </td>
              <td className="p-2">
                <button
                  onClick={() => markPaid("businesses", b.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Mark Paid
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Barbers */}
      <h2 className="text-2xl font-semibold mt-10 mb-3">Barbers</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Name</th>
            <th className="p-2">Monthly Fee</th>
            <th className="p-2">Last Payment</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {barbers.map((b) => (
            <tr key={b.id} className="border-t">
              <td className="p-2">{b.name}</td>
              <td className="p-2">${b.monthly_fee}</td>
              <td className="p-2">{formatDate(b.last_payment_date)}</td>
              <td className="p-2 font-bold">
                <StatusBadge status={b.payment_status} />
              </td>
              <td className="p-2">
                <button
                  onClick={() => markPaid("barbers", b.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Mark Paid
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
