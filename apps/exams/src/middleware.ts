import { auth } from "@/auth";
import { PAGE_TIMEOUT_MS } from "@/app/_lib/server/curriculum-api/deadline";
import { NextRequest, NextResponse } from "next/server";

// --- Helper: Public route bypass ---
function isPublicRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/monitoring") || // Sentry tunnel route
    /\.(png|jpg|jpeg|gif|webp|svg|ico|mp4|webm|ogg|mp3|wav|txt|json)$/.test(
      pathname,
    )
  );
}

// --- Helper: Public auth pages (exact match or with trailing path) ---
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/reset-password",
];

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// --- Helper: Check if host is an Open Platform subdomain (open.* or beta.*) ---
function isOpenPlatformHost(host: string | undefined): boolean {
  return host?.startsWith("open.") || host?.startsWith("beta.") || false;
}

// --- Helper: Open Platform host alias for open.*/beta.* subdomains ---
function getOpenHostAlias(
  request: NextRequest,
  pathname: string,
): string | null {
  const host = (
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  )
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase()
    .replace(/:\d+$/, "");
  if (!isOpenPlatformHost(host)) return null;

  if (pathname === "/") return "/open";
  if (pathname === "/onboarding") return "/open/onboarding";
  if (pathname === "/doc" || pathname.startsWith("/doc/"))
    return `/open${pathname}`;
  return null;
}

// --- Helper: Safe last lesson redirect with origin validation ---
function getSafeLastLessonRedirect(request: NextRequest): NextResponse | null {
  const lastLessonUrlCookie = request.cookies.get(
    "lastLessonVisitedUrl",
  )?.value;
  if (!lastLessonUrlCookie) return null;

  try {
    const decodedUrl = decodeURIComponent(lastLessonUrlCookie);
    const normalizedUrl = decodedUrl.endsWith("/learn")
      ? decodedUrl.replace(/\/learn$/, "/practice")
      : decodedUrl;

    const redirectUrl = new URL(normalizedUrl, request.url);

    // Validate same origin AND valid /lessons/ path prefix
    if (
      redirectUrl.origin === request.nextUrl.origin &&
      redirectUrl.pathname.startsWith("/lessons/")
    ) {
      return NextResponse.redirect(redirectUrl);
    }
  } catch {
    // Malformed cookie – ignore and continue
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Early return for public routes (no auth lookup needed)
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // --- Open Platform: early checks (no auth/DB calls yet) ---
  const host = (
    request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  )
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase()
    .replace(/:\d+$/, "");
  const isOpenHost = isOpenPlatformHost(host);

  // Canonicalize: redirect open.*/open/... → open.*/...
  if (isOpenHost && (pathname === "/open" || pathname.startsWith("/open/"))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.replace(/^\/open/, "") || "/";
    return NextResponse.redirect(redirectUrl);
  }

  // Compute effective pathname (apply alias for open.* hosts)
  const aliasTarget = getOpenHostAlias(request, pathname);
  const effectivePathname = aliasTarget ?? pathname;

  // Feature flag gate - blocks BEFORE auth() call, no DB queries run
  const isOpenRoute =
    effectivePathname.startsWith("/open") || pathname.startsWith("/api/open");
  if (isOpenRoute && process.env.ENABLE_OPEN_ROUTES !== "true") {
    return NextResponse.rewrite(new URL("/_not-found", request.url));
  }

  // 2. Now we need auth and UA info for protected route logic
  const session = await auth();
  const userAgent = request.headers.get("user-agent") ?? "";
  const isMobileUA = /Mobi|Android|iPhone|iPod|iPad/i.test(userAgent);

  // 3. Unauthenticated users
  if (!session?.user?.id || session?.error) {
    // Allow public auth pages
    if (isPublicAuthPath(pathname)) {
      return NextResponse.next();
    }

    // Redirect to login, preserving ref if present
    const ref = request.nextUrl.searchParams.get("ref");
    const loginUrl = new URL("/auth/login", request.url);
    if (ref) {
      loginUrl.searchParams.set("ref", ref);
    }

    return NextResponse.redirect(loginUrl);
  }

  // 4. Authenticated users trying to access auth pages → redirect home
  if (isPublicAuthPath(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 5. Open routes: rewrite if aliased, skip remaining middleware logic
  // Always set x-pathname for the protected layout to read
  if (effectivePathname.startsWith("/open")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", effectivePathname);
    requestHeaders.set(
      "x-request-deadline-ms",
      String(Date.now() + PAGE_TIMEOUT_MS),
    );

    if (aliasTarget) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = aliasTarget;
      return NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // 6. Early redirect from home to last viewed lesson (desktop only)
  if (
    pathname === "/" &&
    !isMobileUA &&
    request.cookies.get("intentionalHomeVisit")?.value !== "true"
  ) {
    const redirect = getSafeLastLessonRedirect(request);
    if (redirect) return redirect;
  }

  // 7. Set x-pathname and deadline headers for layout/fetchers to read
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set(
    "x-request-deadline-ms",
    String(Date.now() + PAGE_TIMEOUT_MS),
  );

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|monitoring).*)",
    "/api/open/:path*",
  ],
};
