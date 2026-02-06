import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Helper function to hash data with SHA-256
function hashData(data: string): string {
  return crypto
    .createHash("sha256")
    .update(data.trim().toLowerCase())
    .digest("hex");
}

// Helper function to validate IP address
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// Helper function to check if IP is private/internal
function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^127\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/,
    /^fe80:/
  ];
  return privateRanges.some(range => range.test(ip));
}

// Helper function to get client IP address
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIP = req.headers.get("x-real-ip");
  
  if (forwarded) {
    const ip = forwarded.split(',')[0].trim();
    if (isValidIP(ip) && !isPrivateIP(ip)) {
      return ip;
    }
  }
  if (realIP) {
    if (isValidIP(realIP) && !isPrivateIP(realIP)) {
      return realIP;
    }
  }
  
  const fallbackIP = req.ip || "";
  if (fallbackIP && isValidIP(fallbackIP) && !isPrivateIP(fallbackIP)) {
    return fallbackIP;
  }
  
  return "";
}

// Helper function to extract ttclid from URL
function extractTtclid(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("ttclid") || undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, userData, customData, eventSourceUrl, eventId } = body;

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

    // Validate environment variables
    const pixelCode = process.env.TIKTOK_PIXEL_CODE;
    const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

    if (!pixelCode || !accessToken) {
      console.error(
        "Configuration error: Missing TikTok Pixel Code or Access Token"
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Prepare user data for TikTok
    const tiktokUserData: any = {};

    // Helper function to validate email format
    function isValidEmail(email: string): boolean {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    }

    // Hash email addresses if present - TikTok requires array format
    if (userData.email) {
      const emails = Array.isArray(userData.email) ? userData.email : [userData.email];
      tiktokUserData.email = emails
        .filter((email: string) => email && isValidEmail(email))
        .map((email: string) => hashData(email))
        .filter(Boolean);
    }

    // Add IP address and User Agent for better matching
    const clientIP = getClientIP(req);
    if (clientIP) {
      tiktokUserData.ip = clientIP;
    }

    const userAgent = req.headers.get("user-agent");
    if (userAgent) {
      tiktokUserData.user_agent = userAgent;
    }

    // Add ttclid if present in the URL
    if (eventSourceUrl) {
      const ttclid = extractTtclid(eventSourceUrl);
      if (ttclid) {
        tiktokUserData.ttclid = ttclid;
      }
    }

    // Current timestamp in seconds (TikTok requires Unix timestamp)
    const eventTime = Math.floor(Date.now() / 1000);

    // Generate event_id for deduplication if not provided
    const finalEventId = eventId || `${eventTime}_${crypto.randomBytes(8).toString('hex')}`;

    // Prepare TikTok Events API 2.0 payload
    const payload = {
      event_source: "web",
      event_source_id: pixelCode,
      data: [
        {
          event: eventName,
          event_time: eventTime,
          event_id: finalEventId,
          user: tiktokUserData,
          properties: {
            ...customData,
          },
          page: {
            url: eventSourceUrl || "",
            referrer: req.headers.get("referer") || "",
          },
        },
      ],
    };

    const apiUrl = `https://business-api.tiktok.com/open_api/v1.3/event/track/`;

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": accessToken,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        console.error("TikTok API error:", {
          status: response.status,
          statusText: response.statusText,
          requestId: finalEventId,
        });

        return NextResponse.json(
          {
            error: "TikTok tracking service temporarily unavailable",
            requestId: finalEventId,
          },
          { status: 503 }
        );
      }

      const result = await response.json();
      return NextResponse.json(result);
    } catch (fetchError) {
      // DOMException doesn't inherit from Error in all environments,
      // so we use duck typing to detect TimeoutError from AbortSignal.timeout()
      const isTimeoutError =
        fetchError instanceof DOMException && fetchError.name === "TimeoutError";

      if (isTimeoutError) {
        console.error("TikTok API timeout:", { requestId: finalEventId });
        return NextResponse.json(
          { error: "TikTok API timeout", requestId: finalEventId },
          { status: 504 }
        );
      }

      console.error("Network error when calling TikTok API:", fetchError);
      return NextResponse.json(
        { error: "Network error when calling TikTok API" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("TikTok Conversion API Error:", error);

    // Determine if it's a parsing error
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error processing TikTok event" },
      { status: 500 }
    );
  }
}