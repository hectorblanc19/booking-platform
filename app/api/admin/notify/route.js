import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_EMAIL = "info@flowpaydr.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      type,
      business_name,
      category,
      owner_email,
      business_phone,
      provider_name,
      provider_email,
      provider_phone,
      provider_specialty,
    } = body;

    let subject = "";
    let title = "";
    let detailsHtml = "";

    // --------------------------------------------------
    // NEW BUSINESS REGISTRATION
    // --------------------------------------------------
    if (type === "new_business") {
      if (!business_name) {
        return NextResponse.json(
          { success: false, error: "Missing business name" },
          { status: 400 }
        );
      }

      subject = `🆕 Nuevo negocio en FlowPayDR — ${business_name}`;
      title = "🆕 Nuevo negocio registrado";

      detailsHtml = `
        <p><strong>Negocio:</strong> ${escapeHtml(business_name)}</p>
        <p><strong>Categoría:</strong> ${escapeHtml(category || "No especificada")}</p>
        <p><strong>Correo:</strong> ${escapeHtml(owner_email || "No especificado")}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(business_phone || "No especificado")}</p>
      `;
    }

    // --------------------------------------------------
    // NEW PROVIDER / PROFESSIONAL
    // --------------------------------------------------
    else if (type === "new_provider") {
      if (!business_name || !provider_name) {
        return NextResponse.json(
          { success: false, error: "Missing business or provider name" },
          { status: 400 }
        );
      }

      subject = `👤 Nuevo profesional — ${provider_name}`;
      title = "👤 Nuevo profesional agregado";

      detailsHtml = `
        <p><strong>Negocio:</strong> ${escapeHtml(business_name)}</p>
        <p><strong>Profesional:</strong> ${escapeHtml(provider_name)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(provider_email || "No especificado")}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(provider_phone || "No especificado")}</p>
        <p><strong>Especialidad:</strong> ${escapeHtml(provider_specialty || "No especificada")}</p>
      `;
    }

    // --------------------------------------------------
    // INVALID NOTIFICATION TYPE
    // --------------------------------------------------
    else {
      return NextResponse.json(
        { success: false, error: "Invalid notification type" },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: "FlowPayDR <info@flowpaydr.com>",
      to: ADMIN_EMAIL,
      subject,
      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            max-width: 560px;
            margin: auto;
            padding: 24px;
            background: #ffffff;
            border: 1px solid #eeeeee;
            border-radius: 12px;
          "
        >
          <h2 style="text-align:center;">
            ${title}
          </h2>

          <div
            style="
              margin-top: 20px;
              padding: 18px;
              background: #f8fafc;
              border-radius: 10px;
            "
          >
            ${detailsHtml}
          </div>

          <p
            style="
              margin-top: 25px;
              text-align: center;
              font-size: 12px;
              color: #666666;
            "
          >
            FlowPayDR Admin Notification
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Admin notification email error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send admin notification",
        },
        { status: 500 }
      );
    }

    console.log("FlowPayDR admin notification sent:", type, data?.id);

    return NextResponse.json({
      success: true,
      id: data?.id || null,
    });
  } catch (error) {
    console.error("Admin notification error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Admin notification failed",
      },
      { status: 500 }
    );
  }
}