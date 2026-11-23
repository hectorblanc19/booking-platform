"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function BankPaymentPage() {
  const { secret } = useParams();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState("es");
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (searchParams.get("lang") === "en") setLang("en");
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/payment/bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ secret }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Payment unavailable.");
        }

        setPayment(result.payment);

        const savedLang = result.payment.lang;
        if (savedLang === "es" || savedLang === "en") {
          setLang(savedLang);
        }
      } catch (err) {
        setError(err.message);
      }
    }

    if (secret) load();
  }, [secret]);

  const es = lang === "es";

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(payment.account_number);
      setCopied(true);
    } catch {
      setError(es ? "No se pudo copiar." : "Could not copy.");
    }
  }

  function whatsappLink() {
    let phone = String(payment.receipt_whatsapp || "").replace(/\D/g, "");

    if (phone.length === 10) phone = "1" + phone;

    const amount = new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(Number(payment.price || 0));

    const groupDetails = payment.is_group && Array.isArray(payment.group_members)
      ? payment.group_members
          .map((member, index) =>
            `${index + 1}. ${member.customer_name} - ${member.service}`
          )
          .join("\n")
      : "";

    const message = payment.is_group
      ? es
        ? `Hola, quiero enviar el comprobante de transferencia bancaria de mi reserva de grupo en FlowPayDR.

Citas del grupo:
${groupDetails}

Fecha: ${payment.date}
Total del grupo: ${amount}

Te envío el comprobante de la transferencia para que puedas verificar el pago. Gracias.`
        : `Hello, I would like to send the bank transfer receipt for my FlowPayDR group booking.

Group appointments:
${groupDetails}

Date: ${payment.date}
Group total: ${amount}

Here is my bank transfer receipt.`
      : es
      ? `Hola, quiero enviar el comprobante de transferencia bancaria de mi cita en FlowPayDR.

Cliente: ${payment.customer_name}
Servicio: ${payment.service}
Fecha: ${payment.date}
Monto: ${amount}

Adjunto mi comprobante de transferencia.`
      : `Hello, I would like to send the bank transfer receipt for my FlowPayDR appointment.

Customer: ${payment.customer_name}
Service: ${payment.service}
Date: ${payment.date}
Amount: ${amount}

Here is my bank transfer receipt.`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#101010",
      color: "#fff",
      padding: "40px 16px",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{
        maxWidth: 480,
        margin: "0 auto",
        background: "#1c1c1c",
        borderRadius: 16,
        padding: 26
      }}>
        <div style={{ textAlign: "right", marginBottom: 20 }}>
          <button onClick={() => setLang(es ? "en" : "es")}>
            {es ? "English" : "Español"}
          </button>
        </div>

        <h1 style={{ fontSize: 25, marginBottom: 12 }}>
          {es ? "Transferencia bancaria" : "Bank transfer"}
        </h1>

        <p style={{ color: "#bbb", marginBottom: 24 }}>
          {es
            ? "Este pago es opcional. También puedes pagar en el negocio."
            : "This payment is optional. You can also pay at the business."}
        </p>

        {error && <p role="alert">{error}</p>}
        {!payment && !error && <p>{es ? "Cargando..." : "Loading..."}</p>}

        {payment && (
          <>
            {payment.is_group && Array.isArray(payment.group_members) ? (
              <div>
                <h3 style={{ marginBottom: 14 }}>
                  {es ? "Citas del grupo" : "Group appointments"}
                </h3>

                {payment.group_members.map((member, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid #444"
                    }}
                  >
                    <strong>{index + 1}. {member.customer_name}</strong>
                    <p style={{ margin: "6px 0" }}>{member.service}</p>
                    <span style={{ color: "#e5b84a" }}>
                      {new Intl.NumberFormat("es-DO", {
                        style: "currency",
                        currency: "DOP"
                      }).format(Number(member.price || 0))}
                    </span>
                  </div>
                ))}

                <p style={{ marginTop: 18, fontWeight: "bold" }}>
                  {es ? "Total del grupo" : "Group total"}
                </p>
              </div>
            ) : (
              <p>{payment.service}</p>
            )}

            <h2 style={{ color: "#e5b84a", fontSize: 32 }}>
              {new Intl.NumberFormat("es-DO", {
                style: "currency",
                currency: "DOP"
              }).format(Number(payment.price || 0))}
            </h2>

            <hr style={{ margin: "24px 0", borderColor: "#444" }} />

            <p><strong>{es ? "Banco" : "Bank"}:</strong> {payment.bank_name}</p>
            <p><strong>{es ? "Titular" : "Account holder"}:</strong> {payment.account_holder}</p>
            <p><strong>{es ? "Tipo de cuenta" : "Account type"}:</strong> {payment.account_type === "savings" ? (es ? "Ahorros" : "Savings") : payment.account_type === "checking" ? (es ? "Corriente" : "Checking") : payment.account_type}</p>
            <p><strong>{es ? "Número de cuenta" : "Account number"}:</strong> {payment.account_number}</p>

            <button
              onClick={copyAccount}
              style={{
                width: "100%",
                padding: 14,
                marginTop: 20,
                background: "#e5b84a",
                color: "#111",
                border: 0,
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              {copied
                ? (es ? "¡Copiado!" : "Copied!")
                : (es ? "Copiar número de cuenta" : "Copy account number")}
            </button>

            {payment.receipt_whatsapp && (
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: 14,
                  marginTop: 14,
                  background: "#25D366",
                  color: "#111",
                  borderRadius: 8,
                  fontWeight: "bold",
                  textDecoration: "none"
                }}
              >
                {es ? "Enviar comprobante por WhatsApp" : "Send receipt via WhatsApp"}
              </a>
            )}

            <p style={{ fontSize: 13, color: "#aaa", marginTop: 24 }}>
              {es
                ? "El negocio verificará el pago directamente en su cuenta bancaria. FlowPayDR no procesa esta transferencia."
                : "The business will verify payment directly in its bank account. FlowPayDR does not process this transfer."}
            </p>
          </>
        )}
      </div>
    </main>
  );
}