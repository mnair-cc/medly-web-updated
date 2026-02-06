import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  // Construct the home URL using origin from headers or fallback to nextUrl
  // This ensures correct URL construction behind proxies (e.g., Heroku)
  let origin =
    request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || null;

  if (!origin) {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedProto && forwardedHost) {
      origin = `${forwardedProto}://${forwardedHost}`;
    } else {
      const host = request.headers.get("host");
      if (host) {
        origin = `${request.nextUrl.protocol}//${host}`;
      } else {
        origin = request.nextUrl.origin;
      }
    }
  }

  const home = new URL("/", origin);
  const res = NextResponse.redirect(home);
  // Prevent immediate home auto-redirect back to last lesson
  res.cookies.set("intentionalHomeVisit", "true", { path: "/", maxAge: 10 });
  // Clear last visited lesson URL to avoid future loops
  res.cookies.set("lastLessonVisitedUrl", "", { path: "/", maxAge: 0 });
  return res;
}
