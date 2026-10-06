"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminPayments() {
  const [businesses, setBusinesses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [historyBusiness, setHistoryBusiness] = useState(null);
  const [billingBusiness, setBillingBusiness] = useState(null);

  const [form, setForm] = useState({
    amount: "",
    payment_date: getToday(),
    payment_method: "Bank Transfer",
    reference: "",
    note: "",
  });

  const [billingForm, setBillingForm] = useState({
    monthly_fee: "",
    trial_start_date: "",
    trial_end_date: "",
    billing_enabled: true,
  });

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);

    try {
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select(
          `
            id,
            name,
            monthly_fee,
            last_payment_date,
            payment_status,
            created_at,
            trial_start_date,
            trial_end_date,
            billing_enabled
          `
        )
        .order("name", { ascending: true });

      if (businessError) {
        throw businessError;
      }

      const { data: paymentData, error: paymentError } = await supabase
        .from("business_payments")
        .select(
          `
            id,
            business_id,
            amount,
            payment_date,
            payment_method,
            reference,
            note,
            created_at
          `
        )
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (paymentError) {
        throw paymentError;
      }

      setBusinesses(applyBusinessStatus(businessData || []));
      setPayments(paymentData || []);
    } catch (error) {
      console.error("Error loading payment dashboard:", error);
      alert("Could not load payment information.");
    } finally {
      setLoading(false);
    }
  }

  function applyBusinessStatus(items) {
    return items.map((business) => {
      if (business.billing_enabled === false) {
        return {
          ...business,
          calculated_status: "disabled",
          next_due_date: null,
          trial_days_left: null,
        };
      }

      const today = dateOnly(getToday());

      // ---------------------------------------------
      // ACTIVE FREE TRIAL
      // ---------------------------------------------
      if (
        !business.last_payment_date &&
        business.trial_end_date
      ) {
        const trialEnd = dateOnly(business.trial_end_date);

        if (today <= trialEnd) {
          return {
            ...business,
            calculated_status: "trial",
            next_due_date: null,
            trial_days_left: daysBetween(today, trialEnd),
          };
        }

        return {
          ...business,
          calculated_status: "trial_expired",
          next_due_date: null,
          trial_days_left: 0,
        };
      }

      // ---------------------------------------------
      // NO PAYMENT AND NO TRIAL
      // ---------------------------------------------
      if (!business.last_payment_date) {
        return {
          ...business,
          calculated_status: "never",
          next_due_date: null,
          trial_days_left: null,
        };
      }

      // ---------------------------------------------
      // PAID / OVERDUE
      // ---------------------------------------------
      const nextDue = addOneMonth(business.last_payment_date);
      const due = dateOnly(nextDue);

      return {
        ...business,
        calculated_status: today > due ? "overdue" : "paid",
        next_due_date: nextDue,
        trial_days_left: null,
      };
    });
  }

  function openPaymentModal(business) {
    setSelectedBusiness(business);

    setForm({
      amount:
        business.monthly_fee !== null &&
        business.monthly_fee !== undefined
          ? String(business.monthly_fee)
          : "",
      payment_date: getToday(),
      payment_method: "Bank Transfer",
      reference: "",
      note: "",
    });
  }

  function closePaymentModal() {
    if (saving) return;
    setSelectedBusiness(null);
  }

  function openBillingModal(business) {
    setBillingBusiness(business);

    setBillingForm({
      monthly_fee:
        business.monthly_fee !== null &&
        business.monthly_fee !== undefined
          ? String(business.monthly_fee)
          : "",
      trial_start_date: business.trial_start_date || "",
      trial_end_date: business.trial_end_date || "",
      billing_enabled: business.billing_enabled !== false,
    });
  }

  function closeBillingModal() {
    if (saving) return;
    setBillingBusiness(null);
  }

  async function saveBilling(event) {
    event.preventDefault();

    if (!billingBusiness || saving) return;

    const monthlyFee = Number(billingForm.monthly_fee);

    if (
      billingForm.monthly_fee === "" ||
      Number.isNaN(monthlyFee) ||
      monthlyFee < 0
    ) {
      alert("Enter a valid monthly fee.");
      return;
    }

    if (
      billingForm.trial_start_date &&
      billingForm.trial_end_date &&
      billingForm.trial_end_date < billingForm.trial_start_date
    ) {
      alert("Trial end date cannot be before trial start date.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          monthly_fee: monthlyFee,
          trial_start_date: billingForm.trial_start_date || null,
          trial_end_date: billingForm.trial_end_date || null,
          billing_enabled: billingForm.billing_enabled,
        })
        .eq("id", billingBusiness.id);

      if (error) {
        throw error;
      }

      setBillingBusiness(null);
      await loadPayments();
    } catch (error) {
      console.error("Error updating billing:", error);

      alert(
        error?.message
          ? `Could not update billing: ${error.message}`
          : "Could not update billing."
      );
    } finally {
      setSaving(false);
    }
  }

  async function savePayment(event) {
    event.preventDefault();

    if (!selectedBusiness || saving) return;

    const amount = Number(form.amount);

    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      alert("Enter a valid payment amount.");
      return;
    }

    if (!form.payment_date) {
      alert("Select the actual payment date.");
      return;
    }

    setSaving(true);

    try {
      const { data: insertedPayment, error: paymentError } = await supabase
        .from("business_payments")
        .insert({
          business_id: selectedBusiness.id,
          amount,
          payment_date: form.payment_date,
          payment_method: form.payment_method || null,
          reference: form.reference.trim() || null,
          note: form.note.trim() || null,
        })
        .select()
        .single();

      if (paymentError) {
        throw paymentError;
      }

      const businessPayments = [
        ...payments.filter(
          (payment) => payment.business_id === selectedBusiness.id
        ),
        insertedPayment,
      ];

      const latestPayment = businessPayments.reduce((latest, payment) => {
        if (!latest) return payment;

        if (payment.payment_date > latest.payment_date) {
          return payment;
        }

        return latest;
      }, null);

      const { error: businessError } = await supabase
        .from("businesses")
        .update({
          last_payment_date: latestPayment.payment_date,
          payment_status: "paid",
        })
        .eq("id", selectedBusiness.id);

      if (businessError) {
        throw businessError;
      }

      setSelectedBusiness(null);
      await loadPayments();
    } catch (error) {
      console.error("Error recording payment:", error);

      alert(
        error?.message
          ? `Could not record payment: ${error.message}`
          : "Could not record payment."
      );
    } finally {
      setSaving(false);
    }
  }

  const sortedBusinesses = useMemo(() => {
    const order = {
      overdue: 0,
      trial_expired: 1,
      never: 2,
      trial: 3,
      paid: 4,
      disabled: 5,
    };

    return [...businesses].sort((a, b) => {
      const aOrder = order[a.calculated_status] ?? 99;
      const bOrder = order[b.calculated_status] ?? 99;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      return a.name.localeCompare(b.name);
    });
  }, [businesses]);

  const summary = useMemo(() => {
    const paid = businesses.filter(
      (business) => business.calculated_status === "paid"
    ).length;

    const trials = businesses.filter(
      (business) => business.calculated_status === "trial"
    ).length;

    const overdue = businesses.filter(
      (business) =>
        business.calculated_status === "overdue" ||
        business.calculated_status === "trial_expired"
    ).length;

    const never = businesses.filter(
      (business) => business.calculated_status === "never"
    ).length;

    const currentMonth = getToday().slice(0, 7);

    const collectedThisMonth = payments
      .filter((payment) => payment.payment_date?.startsWith(currentMonth))
      .reduce(
        (total, payment) => total + Number(payment.amount || 0),
        0
      );

    return {
      total: businesses.length,
      paid,
      trials,
      overdue,
      never,
      collectedThisMonth,
    };
  }, [businesses, payments]);

  const selectedHistory = useMemo(() => {
    if (!historyBusiness) return [];

    return payments
      .filter(
        (payment) => payment.business_id === historyBusiness.id
      )
      .sort((a, b) => {
        if (a.payment_date === b.payment_date) {
          return new Date(b.created_at) - new Date(a.created_at);
        }

        return b.payment_date.localeCompare(a.payment_date);
      });
  }, [historyBusiness, payments]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-5 py-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <p className="font-bold text-gray-500">
              Loading payment dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-8 sm:py-12">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-gray-400">
              FLOWPAYDR ADMIN
            </p>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-2">
              Payment Dashboard
            </h1>

            <p className="text-gray-500 mt-2">
              Manage subscriptions, trials and payment history.
            </p>
          </div>

          <button
            type="button"
            onClick={loadPayments}
            className="self-start lg:self-auto border border-gray-200 bg-white px-5 py-3 rounded-xl font-bold hover:bg-gray-100 transition"
          >
            Refresh
          </button>
        </div>

        {/* SUMMARY */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-4 mt-8">
          <SummaryCard
            label="Businesses"
            value={summary.total}
            detail="Total accounts"
          />

          <SummaryCard
            label="Trials"
            value={summary.trials}
            detail="Active free trials"
          />

          <SummaryCard
            label="Paid"
            value={summary.paid}
            detail="Currently paid"
          />

          <SummaryCard
            label="Needs Attention"
            value={summary.overdue}
            detail="Overdue / expired"
          />

          <SummaryCard
            label="Never Paid"
            value={summary.never}
            detail="No payment recorded"
          />

          <SummaryCard
            label="Collected This Month"
            value={formatMoney(summary.collectedThisMonth)}
            detail="Payment history total"
          />
        </div>

        {/* BUSINESSES */}
        <section className="mt-8 bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 sm:px-6 py-5 border-b border-gray-100">
            <h2 className="text-xl font-black">Businesses</h2>

            <p className="text-sm text-gray-500 mt-1">
              Billing is managed by business account.
            </p>
          </div>

          {sortedBusinesses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No businesses found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px]">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Business
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Monthly Fee
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Trial
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Last Payment
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Next Due
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sortedBusinesses.map((business) => (
                    <tr
                      key={business.id}
                      className="border-t border-gray-100"
                    >
                      <td className="px-5 py-4">
                        <p className="font-black">{business.name}</p>

                        <p className="text-xs text-gray-400 mt-1">
                          {business.id}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-bold">
                        {formatMoney(business.monthly_fee || 0)}
                      </td>

                      <td className="px-5 py-4">
                        {business.trial_end_date ? (
                          <div>
                            <p className="font-bold">
                              Ends {formatDate(business.trial_end_date)}
                            </p>

                            {business.calculated_status === "trial" && (
                              <p className="text-xs text-blue-600 font-bold mt-1">
                                {trialText(business.trial_days_left)}
                              </p>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {business.last_payment_date
                          ? formatDate(business.last_payment_date)
                          : "Never"}
                      </td>

                      <td className="px-5 py-4">
                        {business.next_due_date
                          ? formatDate(business.next_due_date)
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={business.calculated_status}
                          daysLeft={business.trial_days_left}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openBillingModal(business)}
                            className="border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-black hover:bg-gray-50 transition"
                          >
                            Edit Billing
                          </button>

                          <button
                            type="button"
                            onClick={() => openPaymentModal(business)}
                            disabled={business.billing_enabled === false}
                            className="bg-black text-white px-4 py-2 rounded-lg text-sm font-black hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Record Payment
                          </button>

                          <button
                            type="button"
                            onClick={() => setHistoryBusiness(business)}
                            className="border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-black hover:bg-gray-50 transition"
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* EDIT BILLING MODAL */}
      {billingBusiness && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-gray-400">
                  EDIT BILLING
                </p>

                <h2 className="text-2xl font-black mt-1">
                  {billingBusiness.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeBillingModal}
                disabled={saving}
                className="w-10 h-10 rounded-full bg-gray-100 font-black hover:bg-gray-200 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveBilling} className="p-6">
              <Field label="Monthly Fee">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-gray-500">
                    RD$
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={billingForm.monthly_fee}
                    onChange={(event) =>
                      setBillingForm((current) => ({
                        ...current,
                        monthly_fee: event.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-black"
                    required
                  />
                </div>
              </Field>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <Field label="Trial Start">
                  <input
                    type="date"
                    value={billingForm.trial_start_date}
                    onChange={(event) =>
                      setBillingForm((current) => ({
                        ...current,
                        trial_start_date: event.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black"
                  />
                </Field>

                <Field label="Trial End">
                  <input
                    type="date"
                    value={billingForm.trial_end_date}
                    onChange={(event) =>
                      setBillingForm((current) => ({
                        ...current,
                        trial_end_date: event.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black"
                  />
                </Field>
              </div>

              <label className="flex items-center justify-between gap-4 border border-gray-200 rounded-xl p-4 mt-5">
                <div>
                  <p className="font-black">Billing Enabled</p>

                  <p className="text-sm text-gray-500 mt-1">
                    Turn this off if you do not want to bill this business.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={billingForm.billing_enabled}
                  onChange={(event) =>
                    setBillingForm((current) => ({
                      ...current,
                      billing_enabled: event.target.checked,
                    }))
                  }
                  className="w-5 h-5"
                />
              </label>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeBillingModal}
                  disabled={saving}
                  className="border border-gray-200 px-5 py-3 rounded-xl font-black hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-black text-white px-6 py-3 rounded-xl font-black hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Billing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-gray-400">
                  RECORD PAYMENT
                </p>

                <h2 className="text-2xl font-black mt-1">
                  {selectedBusiness.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={closePaymentModal}
                disabled={saving}
                className="w-10 h-10 rounded-full bg-gray-100 font-black hover:bg-gray-200 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form onSubmit={savePayment} className="p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Amount">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-gray-500">
                      RD$
                    </span>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-black"
                      required
                    />
                  </div>
                </Field>

                <Field label="Actual Payment Date">
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        payment_date: event.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black"
                    required
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Payment Method">
                  <select
                    value={form.payment_method}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        payment_method: event.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white outline-none focus:border-black"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Reference">
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reference: event.target.value,
                      }))
                    }
                    placeholder="Optional payment reference"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black"
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Note">
                  <textarea
                    rows={3}
                    value={form.note}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Optional note"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-black resize-none"
                  />
                </Field>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mt-5">
                <p className="text-sm text-gray-500">
                  The payment will be saved permanently in this
                  business&apos;s payment history.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  disabled={saving}
                  className="border border-gray-200 px-5 py-3 rounded-xl font-black hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-black text-white px-6 py-3 rounded-xl font-black hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAYMENT HISTORY MODAL */}
      {historyBusiness && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-gray-400">
                  PAYMENT HISTORY
                </p>

                <h2 className="text-2xl font-black mt-1">
                  {historyBusiness.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setHistoryBusiness(null)}
                className="w-10 h-10 rounded-full bg-gray-100 font-black hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto">
              {selectedHistory.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="font-black">No payment history yet.</p>

                  <p className="text-sm text-gray-500 mt-2">
                    Record the first payment for this business when payment is
                    received.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead className="bg-gray-50 text-left">
                      <tr>
                        <th className="px-5 py-4 text-xs font-black uppercase text-gray-500">
                          Date
                        </th>

                        <th className="px-5 py-4 text-xs font-black uppercase text-gray-500">
                          Amount
                        </th>

                        <th className="px-5 py-4 text-xs font-black uppercase text-gray-500">
                          Method
                        </th>

                        <th className="px-5 py-4 text-xs font-black uppercase text-gray-500">
                          Reference
                        </th>

                        <th className="px-5 py-4 text-xs font-black uppercase text-gray-500">
                          Note
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedHistory.map((payment) => (
                        <tr
                          key={payment.id}
                          className="border-t border-gray-100"
                        >
                          <td className="px-5 py-4 font-bold">
                            {formatDate(payment.payment_date)}
                          </td>

                          <td className="px-5 py-4 font-black">
                            {formatMoney(payment.amount)}
                          </td>

                          <td className="px-5 py-4">
                            {payment.payment_method || "—"}
                          </td>

                          <td className="px-5 py-4">
                            {payment.reference || "—"}
                          </td>

                          <td className="px-5 py-4 text-sm text-gray-500 max-w-xs">
                            {payment.note || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryBusiness(null)}
                className="bg-black text-white px-5 py-3 rounded-xl font-black hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SummaryCard({ label, value, detail }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-sm font-bold text-gray-500">{label}</p>
      <p className="text-2xl font-black mt-2">{value}</p>
      <p className="text-xs text-gray-400 mt-2">{detail}</p>
    </div>
  );
}

function StatusBadge({ status, daysLeft }) {
  if (status === "trial") {
    return (
      <span className="inline-flex bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-black">
        TRIAL · {trialText(daysLeft)}
      </span>
    );
  }

  if (status === "paid") {
    return (
      <span className="inline-flex bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-black">
        PAID
      </span>
    );
  }

  if (status === "overdue") {
    return (
      <span className="inline-flex bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-xs font-black">
        OVERDUE
      </span>
    );
  }

  if (status === "trial_expired") {
    return (
      <span className="inline-flex bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-xs font-black">
        TRIAL EXPIRED
      </span>
    );
  }

  if (status === "disabled") {
    return (
      <span className="inline-flex bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full text-xs font-black">
        BILLING OFF
      </span>
    );
  }

  return (
    <span className="inline-flex bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-black">
      NEVER PAID
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-black mb-2">{label}</span>
      {children}
    </label>
  );
}

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateOnly(value) {
  return new Date(`${value}T00:00:00`);
}

function daysBetween(start, end) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.max(
    0,
    Math.ceil((end.getTime() - start.getTime()) / millisecondsPerDay)
  );
}

function trialText(daysLeft) {
  if (daysLeft === 0) {
    return "ENDS TODAY";
  }

  if (daysLeft === 1) {
    return "1 DAY LEFT";
  }

  return `${daysLeft} DAYS LEFT`;
}

function addOneMonth(value) {
  const [year, month, day] = value.split("-").map(Number);

  const target = new Date(year, month, 1);

  const lastDayOfTargetMonth = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0
  ).getDate();

  const safeDay = Math.min(day, lastDayOfTargetMonth);

  const result = new Date(
    target.getFullYear(),
    target.getMonth(),
    safeDay
  );

  const resultYear = result.getFullYear();
  const resultMonth = String(result.getMonth() + 1).padStart(2, "0");
  const resultDay = String(result.getDate()).padStart(2, "0");

  return `${resultYear}-${resultMonth}-${resultDay}`;
}

function formatDate(value) {
  if (!value) return "—";

  const [year, month, day] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatMoney(value) {
  const amount = Number(value || 0);

  return `RD$${amount.toLocaleString("en-US", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}