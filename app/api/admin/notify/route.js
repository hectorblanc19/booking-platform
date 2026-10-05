import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ADMIN_EMAIL = "info@flowpaydr.com";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

async function isFlowPayAdmin(userId) {
  const { data, error } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Admin verification error:", error);
    return false;
  }

  return Boolean(data);
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      type,
      business_id,
      provider_id,
      registration_user_id,
    } = body;

    // --------------------------------------------------
    // AUTHENTICATION
    // --------------------------------------------------
    const user = await getAuthenticatedUser(req);

    // Provider notifications always require authentication.
    if (type === "new_provider" && !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    let subject = "";
    let title = "";
    let detailsHtml = "";
    let notificationEntityId = null;

    // --------------------------------------------------
    // NEW BUSINESS REGISTRATION
    // --------------------------------------------------
    if (type === "new_business") {
      if (!business_id || !registration_user_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing business or registration user ID",
          },
          { status: 400 }
        );
      }

      const { data: business, error: businessError } =
        await supabaseAdmin
          .from("businesses")
          .select(
            "id, name, category, phone, owner_id"
          )
          .eq("id", business_id)
          .eq("owner_id", registration_user_id)
          .single();

      if (businessError || !business) {
        console.error(
          "Business lookup error:",
          businessError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Business not found",
          },
          { status: 404 }
        );
      }

      // --------------------------------------------------
      // VERIFY NEW BUSINESS REGISTRATION
      // --------------------------------------------------
      if (business.owner_id !== registration_user_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
          },
          { status: 403 }
        );
      }

      // If the registration already has an authenticated
      // session, it must belong to this same owner.
      if (user && user.id !== registration_user_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
          },
          { status: 403 }
        );
      }

      // --------------------------------------------------
      // GET REGISTRATION USER FROM SUPABASE AUTH
      // --------------------------------------------------
      const {
        data: registrationUserData,
        error: registrationUserError,
      } = await supabaseAdmin.auth.admin.getUserById(
        registration_user_id
      );

      if (
        registrationUserError ||
        !registrationUserData?.user
      ) {
        console.error(
          "Registration user lookup error:",
          registrationUserError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Registration user not found",
          },
          { status: 404 }
        );
      }

      const registrationUser =
        registrationUserData.user;

      notificationEntityId = business.id;

      subject =
        `🆕 Nuevo negocio en FlowPayDR — ${business.name}`;

      title = "🆕 Nuevo negocio registrado";

      detailsHtml = `
        <p><strong>Negocio:</strong> ${escapeHtml(
          business.name
        )}</p>

        <p><strong>Categoría:</strong> ${escapeHtml(
          business.category || "No especificada"
        )}</p>

        <p><strong>Correo:</strong> ${escapeHtml(
          registrationUser.email || "No especificado"
        )}</p>

        <p><strong>Teléfono:</strong> ${escapeHtml(
          business.phone || "No especificado"
        )}</p>
      `;
    }

    // --------------------------------------------------
    // NEW PROVIDER / PROFESSIONAL
    // --------------------------------------------------
    else if (type === "new_provider") {
      if (!business_id || !provider_id) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing business or provider ID",
          },
          { status: 400 }
        );
      }

      const { data: business, error: businessError } =
        await supabaseAdmin
          .from("businesses")
          .select("id, name, owner_id")
          .eq("id", business_id)
          .single();

      if (businessError || !business) {
        console.error(
          "Business lookup error:",
          businessError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Business not found",
          },
          { status: 404 }
        );
      }

      const userIsAdmin = await isFlowPayAdmin(user.id);

      // Business owner OR FlowPayDR admin may add providers.
      if (
        business.owner_id !== user.id &&
        !userIsAdmin
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden",
          },
          { status: 403 }
        );
      }

      const { data: provider, error: providerError } =
        await supabaseAdmin
          .from("providers")
          .select(
            "id, business_id, name, email, phone, specialty"
          )
          .eq("id", provider_id)
          .eq("business_id", business_id)
          .single();

      if (providerError || !provider) {
        console.error(
          "Provider lookup error:",
          providerError
        );

        return NextResponse.json(
          {
            success: false,
            error: "Provider not found",
          },
          { status: 404 }
        );
      }

      notificationEntityId = provider.id;

      subject =
        `👤 Nuevo profesional — ${provider.name}`;

      title = "👤 Nuevo profesional agregado";

      detailsHtml = `
        <p><strong>Negocio:</strong> ${escapeHtml(
          business.name
        )}</p>

        <p><strong>Profesional:</strong> ${escapeHtml(
          provider.name
        )}</p>

        <p><strong>Correo:</strong> ${escapeHtml(
          provider.email || "No especificado"
        )}</p>

        <p><strong>Teléfono:</strong> ${escapeHtml(
          provider.phone || "No especificado"
        )}</p>

        <p><strong>Especialidad:</strong> ${escapeHtml(
          provider.specialty || "No especificada"
        )}</p>
      `;
    }

    // --------------------------------------------------
    // INVALID NOTIFICATION TYPE
    // --------------------------------------------------
    else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid notification type",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // RESERVE ADMIN NOTIFICATION
    //
    // The database UNIQUE constraint on
    // (event_type, entity_id) prevents the same business
    // or provider alert from being processed twice.
    // --------------------------------------------------
    const {
      data: notificationLog,
      error: notificationLogError,
    } = await supabaseAdmin
      .from("admin_notification_log")
      .insert({
        event_type: type,
        entity_id: notificationEntityId,
      })
      .select("id")
      .single();

    if (notificationLogError) {
      // PostgreSQL unique_violation.
      if (notificationLogError.code === "23505") {
        console.log(
          "Duplicate FlowPayDR admin notification blocked:",
          type,
          notificationEntityId
        );

        return NextResponse.json({
          success: true,
          duplicate: true,
          message: "Notification already processed",
        });
      }

      console.error(
        "Admin notification log error:",
        notificationLogError
      );

      return NextResponse.json(
        {
          success: false,
          error: "Failed to reserve admin notification",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // SEND ADMIN EMAIL
    // --------------------------------------------------
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

    // --------------------------------------------------
    // EMAIL FAILED
    //
    // Remove the reservation so a legitimate retry can
    // attempt the email again.
    // --------------------------------------------------
    if (error) {
      console.error(
        "Admin notification email error:",
        error
      );

      if (notificationLog?.id) {
        const { error: cleanupError } =
          await supabaseAdmin
            .from("admin_notification_log")
            .delete()
            .eq("id", notificationLog.id);

        if (cleanupError) {
          console.error(
            "Admin notification log cleanup error:",
            cleanupError
          );
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send admin notification",
        },
        { status: 500 }
      );
    }

    console.log(
      "FlowPayDR admin notification sent:",
      type,
      data?.id
    );

    return NextResponse.json({
      success: true,
      id: data?.id || null,
    });
  } catch (error) {
    console.error(
      "Admin notification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Admin notification failed",
      },
      { status: 500 }
    );
  }
}