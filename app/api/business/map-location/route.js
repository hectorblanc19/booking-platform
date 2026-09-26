import { NextResponse } from "next/server";

function extractCoordinates(url) {
  if (!url) return null;

  const decodedUrl = decodeURIComponent(url);

  /*
   * IMPORTANT:
   * Google Maps place URLs can contain TWO coordinate pairs:
   *
   * @19.2048567,-69.6285334
   * = map camera/view position
   *
   * !3d19.2064919!4d-69.332054
   * = actual place/business position
   *
   * Always prefer the !3d / !4d coordinates.
   */

  let match = decodedUrl.match(
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/
  );

  if (match) {
    return {
      latitude: Number(match[1]),
      longitude: Number(match[2]),
    };
  }

  // Query formats:
  // ?q=40.7112958,-73.9577406
  // ?query=40.7112958,-73.9577406
  // ?ll=40.7112958,-73.9577406
  match = decodedUrl.match(
    /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
  );

  if (match) {
    return {
      latitude: Number(match[1]),
      longitude: Number(match[2]),
    };
  }

  // Fallback for regular Google Maps URLs.
  // This is often the map camera position, so use it last.
  match = decodedUrl.match(
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/
  );

  if (match) {
    return {
      latitude: Number(match[1]),
      longitude: Number(match[2]),
    };
  }

  return null;
}

function isValidCoordinate(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function isAllowedGoogleMapsUrl(url) {
  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    return (
      hostname === "google.com" ||
      hostname.endsWith(".google.com") ||
      hostname === "maps.google.com" ||
      hostname === "maps.app.goo.gl" ||
      hostname === "goo.gl"
    );
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const mapUrl = String(body?.mapUrl || "").trim();

    if (!mapUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Maps link is required.",
        },
        { status: 400 }
      );
    }

    if (!isAllowedGoogleMapsUrl(mapUrl)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please use a valid Google Maps link.",
        },
        { status: 400 }
      );
    }

    let finalUrl = mapUrl;

    // Resolve Google's short Share -> Copy link.
    const parsedOriginal = new URL(mapUrl);
    const originalHost = parsedOriginal.hostname.toLowerCase();

    if (
      originalHost === "maps.app.goo.gl" ||
      originalHost === "goo.gl"
    ) {
      try {
        const response = await fetch(mapUrl, {
          method: "GET",
          redirect: "follow",
          cache: "no-store",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; FlowPayDR/1.0)",
          },
        });

        if (response.url) {
          finalUrl = response.url;
        }
      } catch (error) {
        console.error("Google Maps redirect error:", error);

        return NextResponse.json(
          {
            success: false,
            error: "Could not open the Google Maps link.",
          },
          { status: 400 }
        );
      }
    }

    const coordinates =
      extractCoordinates(finalUrl) ||
      extractCoordinates(mapUrl);

    if (!coordinates) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not find coordinates in this Google Maps link.",
        },
        { status: 422 }
      );
    }

    const { latitude, longitude } = coordinates;

    if (!isValidCoordinate(latitude, longitude)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid map coordinates.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      mapUrl,
      latitude,
      longitude,
    });
  } catch (error) {
    console.error("Map location API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not process the Google Maps location.",
      },
      { status: 500 }
    );
  }
}