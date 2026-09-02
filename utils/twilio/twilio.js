import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH
);

// ======================================================
// ⭐ NORMALIZE PHONE NUMBER FOR WHATSAPP
// ======================================================

function normalizeWhatsAppNumber(to) {
  if (!to) {
    throw new Error("WhatsApp phone number is required");
  }

  let phone = String(to)
    .trim()
    .replace(/^whatsapp:/i, "")
    .replace(/[^\d+]/g, "");

  // Already international
  if (phone.startsWith("+")) {
    return phone;
  }

  // Dominican Republic local 10-digit number
  if (/^(809|829|849)\d{7}$/.test(phone)) {
    return `+1${phone}`;
  }

  // US/Canada 10-digit number
  if (/^\d{10}$/.test(phone)) {
    return `+1${phone}`;
  }

  throw new Error(`Invalid phone number format: ${to}`);
}

// ======================================================
// ⭐ SMS
// ======================================================

export async function sendSMS(to, message) {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_NUMBER.replace("whatsapp:", ""),
    to,
  });
}

// ======================================================
// ⭐ NORMAL WHATSAPP MESSAGE
// ======================================================

export async function sendWhatsApp(to, message) {
  const phone = normalizeWhatsAppNumber(to);

  return client.messages.create({
    body: message,
    from: process.env.TWILIO_NUMBER,
    to: `whatsapp:${phone}`,
  });
}

// ======================================================
// ⭐ APPROVED WHATSAPP TEMPLATE
// ======================================================

export async function sendWhatsAppTemplate(
  to,
  contentSid,
  variables
) {
  const phone = normalizeWhatsAppNumber(to);

  return client.messages.create({
    from: process.env.TWILIO_NUMBER,
    to: `whatsapp:${phone}`,
    contentSid,
    contentVariables: JSON.stringify(variables),
  });
}