import "server-only";

import { createClient } from "@supabase/supabase-js";
import { sendAppointmentNotification } from "./appointment-notifications.server";

export async function sendVerifiedAppointmentNotification({
  appointmentId,
  notificationType,
}) {
  // Local security testing must never send real notifications.
  if (process.env.NOTIFICATIONS_ENABLED !== "true") {
    return { success: false, skipped: true };
  }

  if (
    !appointmentId ||
    !["new", "reschedule", "cancelled"].includes(notificationType)
  ) {
    return { success: false, error: "Invalid notification request." };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: appointment, error: appointmentError } =
    await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();

  if (appointmentError || !appointment) {
    return { success: false, error: "Appointment not found." };
  }

  const expectedStatus =
    notificationType === "cancelled" ? "cancelled" : "confirmed";

  if (appointment.status !== expectedStatus) {
    return { success: false, error: "Invalid appointment status." };
  }

  const isProvider = Boolean(appointment.provider_id);
  const professionalId = isProvider
    ? appointment.provider_id
    : appointment.barber_id;

  if (!professionalId) {
    return { success: false, error: "Professional not found." };
  }

  let query = supabase
    .from(isProvider ? "providers" : "barbers")
    .select("id, name, email")
    .eq("id", professionalId);

  if (isProvider) {
    query = query.eq("business_id", appointment.business_id);
  }

  const { data: professional, error: professionalError } =
    await query.maybeSingle();

  if (professionalError || !professional?.email) {
    return { success: false, error: "Recipient not found." };
  }

  return sendAppointmentNotification({
    ...(isProvider
      ? {
          provider_id: professional.id,
          provider_name: professional.name,
          provider_email: professional.email,
        }
      : {
          barber_id: professional.id,
          barber_name: professional.name,
          barber_email: professional.email,
        }),
    dashboard_link:
      isProvider &&
      typeof appointment.business_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(appointment.business_id)
        ? `https://www.flowpaydr.com/business/${appointment.business_id}/dashboard`
        : !isProvider &&
          typeof professional.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(professional.id)
        ? `https://www.flowpaydr.com/barber/${professional.id}/dashboard`
        : null,
    customer_name: appointment.customer_name,
    customer_email: appointment.customer_email,
    customer_phone: appointment.customer_phone,
    service: appointment.service,
    date: appointment.date,
    time: appointment.time,
    notes: appointment.notes,
    lang: appointment.lang || "es",
    notification_type: notificationType,
  });
}