
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req) {
  try {
    // --------------------------------------------------
    // AUTHORIZATION HEADER
    // --------------------------------------------------
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const accessToken = authHeader
      .replace("Bearer ", "")
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // REQUEST BODY
    // --------------------------------------------------
    const body = await req.json();
    const providerId = body?.providerId;

    if (!providerId) {
      return NextResponse.json(
        {
          error: "Missing providerId",
          code: "MISSING_PROVIDER_ID",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // SERVER CONFIGURATION
    // --------------------------------------------------
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error(
        "Missing Supabase environment variables for provider access."
      );

      return NextResponse.json(
        {
          error: "Server configuration error",
          code: "SERVER_CONFIGURATION_ERROR",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // AUTH CLIENT
    // Verify the logged-in business owner
    // --------------------------------------------------
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      console.error(
        "Grant provider access auth error:",
        userError
      );

      return NextResponse.json(
        {
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // ADMIN CLIENT
    // --------------------------------------------------
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // --------------------------------------------------
    // LOAD PROVIDER
    // --------------------------------------------------
    const {
      data: provider,
      error: providerError,
    } = await admin
      .from("providers")
      .select(
        `
          id,
          business_id,
          name,
          email,
          user_id,
          dashboard_access,
          access_status
        `
      )
      .eq("id", providerId)
      .maybeSingle();

    if (providerError) {
      console.error(
        "Grant provider access lookup error:",
        providerError
      );

      return NextResponse.json(
        {
          error:
            providerError.message ||
            "Could not load professional",
          code: "PROVIDER_LOOKUP_ERROR",
        },
        { status: 503 }
      );
    }

    if (!provider) {
      return NextResponse.json(
        {
          error: "Professional not found",
          code: "PROVIDER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // PROVIDER MUST HAVE EMAIL
    // --------------------------------------------------
    const providerEmail = provider.email
      ?.trim()
      .toLowerCase();

    if (!providerEmail) {
      return NextResponse.json(
        {
          error:
            "Professional must have an email address before dashboard access can be enabled.",
          code: "PROVIDER_EMAIL_REQUIRED",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // LOAD BUSINESS
    // --------------------------------------------------
    const {
      data: business,
      error: businessError,
    } = await admin
      .from("businesses")
      .select("id, owner_id, name")
      .eq("id", provider.business_id)
      .maybeSingle();

    if (businessError) {
      console.error(
        "Grant provider access business lookup error:",
        businessError
      );

      return NextResponse.json(
        {
          error:
            businessError.message ||
            "Could not load business",
          code: "BUSINESS_LOOKUP_ERROR",
        },
        { status: 503 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          error: "Business not found",
          code: "BUSINESS_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // VERIFY BUSINESS OWNERSHIP
    // --------------------------------------------------
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        {
          error: "Forbidden",
          code: "FORBIDDEN",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // ALREADY ACTIVE
    // --------------------------------------------------
    if (
      provider.user_id &&
      provider.dashboard_access === true &&
      provider.access_status === "active"
    ) {
      return NextResponse.json({
        success: true,
        alreadyActive: true,
        code: "ALREADY_ACTIVE",
        message:
          "Professional already has dashboard access.",
      });
    }

    // --------------------------------------------------
    // DO NOT ALLOW THIS BUSINESS OWNER'S EMAIL
    // --------------------------------------------------
    if (
      user.email &&
      user.email.trim().toLowerCase() === providerEmail
    ) {
      return NextResponse.json(
        {
          error:
            "Use a different email for the professional. The business owner email cannot be used for professional dashboard access.",
          code: "OWNER_EMAIL_NOT_ALLOWED",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // FIND EMAIL IN SUPABASE AUTH
    // --------------------------------------------------
    let existingAuthUser = null;

    let page = 1;
    const perPage = 1000;

    while (!existingAuthUser) {
      const {
        data: usersData,
        error: usersError,
      } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (usersError) {
        console.error(
          "Grant provider access list users error:",
          usersError
        );

        return NextResponse.json(
          {
            error:
              usersError.message ||
              "Could not check professional account",
            code: "AUTH_USER_LOOKUP_ERROR",
          },
          { status: 500 }
        );
      }

      const users = usersData?.users || [];

      existingAuthUser =
        users.find(
          (authUser) =>
            authUser.email?.trim().toLowerCase() ===
            providerEmail
        ) || null;

      if (
        existingAuthUser ||
        users.length < perPage
      ) {
        break;
      }

      page += 1;
    }

    // --------------------------------------------------
    // EXISTING AUTH ACCOUNT
    // --------------------------------------------------
    if (existingAuthUser) {
      // ------------------------------------------------
      // CHECK IF THIS AUTH USER OWNS ANY BUSINESS
      //
      // FlowPayDR rule:
      // A business-owner account cannot also be used
      // as a professional dashboard account.
      // ------------------------------------------------
      const {
        data: ownedBusiness,
        error: ownedBusinessError,
      } = await admin
        .from("businesses")
        .select("id, name")
        .eq("owner_id", existingAuthUser.id)
        .limit(1)
        .maybeSingle();

      if (ownedBusinessError) {
        console.error(
          "Grant provider access business owner check error:",
          ownedBusinessError
        );

        return NextResponse.json(
          {
            error:
              ownedBusinessError.message ||
              "Could not verify professional email",
            code: "BUSINESS_OWNER_CHECK_ERROR",
          },
          { status: 500 }
        );
      }

      if (ownedBusiness) {
        return NextResponse.json(
          {
            error:
              "This email is already being used by a FlowPayDR business owner. Use a different email for the professional.",
            code: "EMAIL_IS_BUSINESS_OWNER",
          },
          { status: 409 }
        );
      }

      // ------------------------------------------------
      // CHECK IF ACCOUNT IS CONNECTED TO ANOTHER
      // PROFESSIONAL
      // ------------------------------------------------
      const {
        data: linkedProvider,
        error: linkedProviderError,
      } = await admin
        .from("providers")
        .select(
          "id, name, business_id, email"
        )
        .eq("user_id", existingAuthUser.id)
        .neq("id", provider.id)
        .limit(1)
        .maybeSingle();

      if (linkedProviderError) {
        console.error(
          "Grant provider access linked provider lookup error:",
          linkedProviderError
        );

        return NextResponse.json(
          {
            error:
              linkedProviderError.message ||
              "Could not verify professional account",
            code: "PROVIDER_ACCOUNT_CHECK_ERROR",
          },
          { status: 500 }
        );
      }

      if (linkedProvider) {
        return NextResponse.json(
          {
            error:
              "This email is already connected to another professional dashboard.",
            code: "EMAIL_IS_OTHER_PROVIDER",
          },
          { status: 409 }
        );
      }

      // ------------------------------------------------
      // SAFE EXISTING AUTH ACCOUNT
      // ACTIVATE PROFESSIONAL ACCESS
      // ------------------------------------------------
      const {
        error: activateError,
      } = await admin
        .from("providers")
        .update({
          user_id: existingAuthUser.id,
          dashboard_access: true,
          access_status: "active",
          invited_at: null,
          activated_at: new Date().toISOString(),
        })
        .eq("id", provider.id)
        .eq("business_id", business.id);

      if (activateError) {
        console.error(
          "Grant provider access activate existing user error:",
          activateError
        );

        return NextResponse.json(
          {
            error:
              activateError.message ||
              "Could not activate professional access",
            code: "PROVIDER_ACTIVATION_ERROR",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        existingAccount: true,
        code: "EXISTING_ACCOUNT_CONNECTED",
        message:
          "Existing account connected to professional dashboard.",
      });
    }

    // --------------------------------------------------
    // BRAND-NEW EMAIL
    // SEND SUPABASE INVITATION
    // --------------------------------------------------
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(
        /\/$/,
        ""
      );

    const redirectTo = baseUrl
  ? `${baseUrl}/provider/activate`
  : undefined;
    const {
      data: inviteData,
      error: inviteError,
    } = await admin.auth.admin.inviteUserByEmail(
      providerEmail,
      {
        redirectTo,
        data: {
          provider_id: provider.id,
          business_id: business.id,
          account_type: "provider",
        },
      }
    );

    if (inviteError) {
      console.error(
        "Grant provider access invitation error:",
        inviteError
      );

      return NextResponse.json(
        {
          error:
            inviteError.message ||
            "Could not send professional invitation",
          code: "INVITATION_ERROR",
        },
        { status: 500 }
      );
    }

    const invitedUser = inviteData?.user;

    if (!invitedUser?.id) {
      return NextResponse.json(
        {
          error:
            "Invitation was sent but the professional account could not be linked.",
          code: "INVITED_USER_MISSING",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // LINK INVITED AUTH USER TO PROVIDER
    //
    // IMPORTANT:
    // The account is INVITED, not ACTIVE yet.
    // --------------------------------------------------
    const {
      error: providerUpdateError,
    } = await admin
      .from("providers")
      .update({
        user_id: invitedUser.id,
        dashboard_access: true,
        access_status: "invited",
        invited_at: new Date().toISOString(),
        activated_at: null,
      })
      .eq("id", provider.id)
      .eq("business_id", business.id);

    if (providerUpdateError) {
      console.error(
        "Grant provider access provider update error:",
        providerUpdateError
      );

      return NextResponse.json(
        {
          error:
            providerUpdateError.message ||
            "Invitation sent, but professional record could not be updated.",
          code: "PROVIDER_INVITE_UPDATE_ERROR",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // SUCCESS — INVITATION SENT
    // --------------------------------------------------
    return NextResponse.json({
      success: true,
      invited: true,
      code: "INVITATION_SENT",
      message: "Professional invitation sent.",
    });
  } catch (error) {
    console.error(
      "Grant provider access error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Server error granting professional access",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}