import { supabase } from "./supabaseClient";

/**
 * Create a new appointment
 */
export async function createAppointment({
  business,
  barber,
  service,
  date,
  time,
  customer,
}) {
  const { data, error } = await supabase
    .from("appointments")
    .insert([
      {
        business_id: business,
        barber_id: barber,
        service,
        date,
        time,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        notes: customer.notes,
        status: "confirmed",
        updated_by: null,
        updated_at: null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error("Failed to create appointment");
  }

  return data;
}

/**
 * Cancel an appointment
 * who = "barber" or "customer"
 */
export async function cancelAppointment(appointmentId, who) {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "canceled",
      updated_by: who,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    console.error("Cancel error:", error);
    throw new Error("Failed to cancel appointment");
  }

  return data;
}

/**
 * Reschedule an appointment
 * who = "barber" or "customer"
 */
export async function rescheduleAppointment(
  appointmentId,
  who,
  newDate,
  newTime
) {
  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: "rescheduled",
      updated_by: who,
      updated_at: new Date().toISOString(),
      date: newDate,
      time: newTime,
    })
    .eq("id", appointmentId)
    .select()
    .single();

  if (error) {
    console.error("Reschedule error:", error);
    throw new Error("Failed to reschedule appointment");
  }

  return data;
}
