import { supabase } from "./supabaseClient";

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
        business,
        barber,
        service,
        date,
        time,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        notes: customer.notes,
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
