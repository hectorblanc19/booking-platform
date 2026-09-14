import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STORAGE_BUCKET = "barber-photos";

// --------------------------------------------------
// Recursively collect every file inside a Storage folder
// --------------------------------------------------
async function collectStorageFiles(storage, prefix) {
  const files = [];

  const { data, error } = await storage
    .from(STORAGE_BUCKET)
    .list(prefix, {
      limit: 1000,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

  if (error) {
    throw error;
  }

  for (const item of data || []) {
    const fullPath = `${prefix}/${item.name}`;

    // Supabase folder entries generally have no file id.
    if (!item.id) {
      const nestedFiles = await collectStorageFiles(
        storage,
        fullPath
      );

      files.push(...nestedFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// --------------------------------------------------
// Delete every file inside one Storage folder
// --------------------------------------------------
async function deleteStorageFolder(storage, prefix) {
  const files = await collectStorageFiles(
    storage,
    prefix
  );

  if (files.length === 0) {
    return;
  }

  const { error } = await storage
    .from(STORAGE_BUCKET)
    .remove(files);

  if (error) {
    throw error;
  }
}

export async function POST(req) {
  try {
    const authHeader =
      req.headers.get("authorization");

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const accessToken = authHeader
      .replace("Bearer ", "")
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { businessId } = await req.json();

    if (!businessId) {
      return NextResponse.json(
        { error: "Missing businessId" },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // AUTH CLIENT
    // Verify logged-in user's token
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
    } = await authClient.auth.getUser(
      accessToken
    );

    if (userError || !user) {
      console.error(
        "Delete business auth error:",
        userError
      );

      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // SERVICE ROLE CHECK
    // --------------------------------------------------
    if (
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error(
        "SUPABASE_SERVICE_ROLE_KEY is missing."
      );

      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
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
    // VERIFY BUSINESS EXISTS
    // --------------------------------------------------
    const {
      data: business,
      error: businessError,
    } = await admin
      .from("businesses")
      .select(
        "id, owner_id, category, photo_url"
      )
      .eq("id", businessId)
      .maybeSingle();

    if (businessError) {
      console.error(
        "Business lookup error:",
        businessError
      );

      return NextResponse.json(
        {
          error:
            businessError.message ||
            "Database error while loading business",
        },
        { status: 503 }
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // VERIFY OWNERSHIP
    // --------------------------------------------------
    if (business.owner_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // KEEP BARBER FLOW SEPARATE
    // --------------------------------------------------
    const normalizedCategory = String(
      business.category || ""
    )
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const isBarberBusiness =
      normalizedCategory.includes("barber") ||
      normalizedCategory.includes("barbero");

    if (isBarberBusiness) {
      return NextResponse.json(
        {
          error:
            "Barber businesses must use the existing barber deletion flow.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // GET PROVIDERS BEFORE DELETING
    // --------------------------------------------------
    const {
      data: providers,
      error: providersError,
    } = await admin
      .from("providers")
      .select("id, photo_url")
      .eq("business_id", businessId);

    if (providersError) {
      console.error(
        "Provider lookup error:",
        providersError
      );

      throw providersError;
    }

    const providerIds = (
      providers || []
    ).map((provider) => provider.id);

    // --------------------------------------------------
    // STORAGE CLEANUP
    //
    // Business photos:
    // businesses/{businessId}/...
    //
    // Provider photos:
    // providers/{businessId}/{providerId}/...
    // --------------------------------------------------
    try {
      await deleteStorageFolder(
        admin.storage,
        `businesses/${businessId}`
      );

      await deleteStorageFolder(
        admin.storage,
        `providers/${businessId}`
      );
    } catch (storageError) {
      console.error(
        "Delete business storage error:",
        storageError
      );

      return NextResponse.json(
        {
          error:
            storageError?.message ||
            "Could not delete business files",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // 1. DELETE APPOINTMENTS
    // --------------------------------------------------
    const {
      error: appointmentsError,
    } = await admin
      .from("appointments")
      .delete()
      .eq("business_id", businessId);

    if (appointmentsError) {
      console.error(
        "Delete appointments error:",
        appointmentsError
      );

      throw appointmentsError;
    }

    // --------------------------------------------------
    // 2. DELETE BUSINESS RATINGS
    // --------------------------------------------------
    const {
      error: ratingsError,
    } = await admin
      .from("ratings")
      .delete()
      .eq("business_id", businessId);

    if (ratingsError) {
      console.error(
        "Delete business ratings error:",
        ratingsError
      );

      throw ratingsError;
    }

    // --------------------------------------------------
    // 3. DELETE PROVIDER AVAILABILITY
    // --------------------------------------------------
    if (providerIds.length > 0) {
      const {
        error: availabilityError,
      } = await admin
        .from("provider_availability")
        .delete()
        .in("provider_id", providerIds);

      if (availabilityError) {
        console.error(
          "Delete provider availability error:",
          availabilityError
        );

        throw availabilityError;
      }
    }

    // --------------------------------------------------
    // 4. DELETE BUSINESS SERVICES
    // --------------------------------------------------
    const {
      error: servicesError,
    } = await admin
      .from("business_services")
      .delete()
      .eq("business_id", businessId);

    if (servicesError) {
      console.error(
        "Delete business services error:",
        servicesError
      );

      throw servicesError;
    }

    // --------------------------------------------------
    // 5. DELETE PROVIDERS
    // --------------------------------------------------
    const {
      error: providersDeleteError,
    } = await admin
      .from("providers")
      .delete()
      .eq("business_id", businessId);

    if (providersDeleteError) {
      console.error(
        "Delete providers error:",
        providersDeleteError
      );

      throw providersDeleteError;
    }

    // --------------------------------------------------
    // 6. DELETE BUSINESS LAST
    // --------------------------------------------------
    const {
      error: businessDeleteError,
    } = await admin
      .from("businesses")
      .delete()
      .eq("id", businessId)
      .eq("owner_id", user.id);

    if (businessDeleteError) {
      console.error(
        "Delete business record error:",
        businessDeleteError
      );

      throw businessDeleteError;
    }

    // --------------------------------------------------
    // KEEP SUPABASE AUTH USER
    // --------------------------------------------------
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Delete business error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Server error deleting business",
      },
      { status: 500 }
    );
  }
}