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
      .select("id, name, monthly_fee, last_payment_date, payment_status, business_id");

    const { data: businessData } = await supabase
      .from("businesses")
      .select("id, name, monthly_fee, last_payment_date, payment_status");

    setBarbers(barberData || []);
    setBusinesses(businessData || []);
  };

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
              <td className="p-2">{b.last_payment_date || "Never"}</td>
              <td className="p-2 font-bold">
                {b.payment_status === "paid" ? (
                  <span className="text-green-600">Paid</span>
                ) : (
                  <span className="text-red-600">Overdue</span>
                )}
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
              <td className="p-2">{b.last_payment_date || "Never"}</td>
              <td className="p-2 font-bold">
                {b.payment_status === "paid" ? (
                  <span className="text-green-600">Paid</span>
                ) : (
                  <span className="text-red-600">Overdue</span>
                )}
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
