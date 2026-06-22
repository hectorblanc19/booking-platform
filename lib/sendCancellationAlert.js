import { sendSMS } from "./sendSMS";
import { sendWhatsApp } from "./sendWhatsApp";

export async function sendCancellationAlert(appt) {
  const message = `Your appointment with ${appt.barber_name} on ${appt.date} at ${appt.time} has been cancelled.`;

  if (appt.customer_phone.startsWith("+1")) {
    await sendSMS(appt.customer_phone, message);
  } else {
    await sendWhatsApp(appt.customer_phone, message);
  }
}
