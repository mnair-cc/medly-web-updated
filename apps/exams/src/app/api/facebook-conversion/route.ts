import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Helper function to hash data with SHA-256
function hashData(data: string): string {
  return crypto
    .createHash("sha256")
    .update(data.trim().toLowerCase())
    .digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, userData, customData, eventSourceUrl } = body;

    // Validate required fields
    if (!eventName) {
      return NextResponse.json(
        { error: "Missing required field: eventName" },
        { status: 400 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { error: "Missing required field: userData" },
        { status: 400 }
      );
    }

    // Check consent cookie (opt-out system)
    const consentCookie = req.cookies.get('CookieScriptConsent');
    
    // Check privacy signals
    const hasGPC = req.headers.get('sec-gpc') === '1';
    const hasDNT = req.headers.get('dnt') === '1';

    if (hasGPC || hasDNT) {
      return NextResponse.json({ 
        ok: false, 
        message: 'Privacy signals active'
      });
    }

    if (consentCookie) {
      try {
        const consent = JSON.parse(decodeURIComponent(consentCookie.value));
        
        // In opt-out system: only block if explicitly rejected
        if (consent.action === 'reject') {
          return NextResponse.json({ 
            ok: false, 
            message: 'Tracking opted out'
          });
        }
        
        // Check if only necessary cookies are allowed
        if (consent.categories && Array.isArray(consent.categories)) {
          if (consent.categories.length === 1 && consent.categories.includes('necessary')) {
            return NextResponse.json({ 
              ok: false, 
              message: 'Marketing tracking disabled'
            });
          }
        }
      } catch (consentError) {
        // Continue with tracking on parse error (opt-out system)
      }
    }

    // Default: allow tracking (opt-out system)

    // Hash email addresses if present
    if (userData.em && Array.isArray(userData.em)) {
      userData.em = userData.em
        .map((email: string) => (email ? hashData(email) : ""))
        .filter(Boolean);
    }

    // Hash phone numbers if present
    if (userData.ph && Array.isArray(userData.ph)) {
      userData.ph = userData.ph
        .map((phone: string) => (phone ? hashData(phone) : ""))
        .filter(Boolean);
    }

    // Current timestamp in seconds
    const eventTime = Math.floor(Date.now() / 1000);

    const data = [
      {
        event_name: eventName,
        event_time: eventTime,
        user_data: userData,
        custom_data: customData,
        event_source_url: eventSourceUrl,
        action_source: "website",
      },
    ];

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    const accessToken = process.env.META_CONVERSION_API_ACCESS_TOKEN;

    if (!pixelId || !accessToken) {
      console.error(
        "Configuration error: Missing Facebook Pixel ID or Access Token"
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const apiUrl = `https://graph.facebook.com/v22.0/${pixelId}/events?access_token=${accessToken}`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Facebook API error:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });

        return NextResponse.json(
          {
            error: "Facebook API error",
            details: errorData || response.statusText,
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      return NextResponse.json(result);
    } catch (fetchError) {
      console.error("Network error when calling Facebook API:", fetchError);
      return NextResponse.json(
        { error: "Network error when calling Facebook API" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Facebook Conversion API Error:", error);

    // Determine if it's a parsing error
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error processing Facebook event" },
      { status: 500 }
    );
  }
}
