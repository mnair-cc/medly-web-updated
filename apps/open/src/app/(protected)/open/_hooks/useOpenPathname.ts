"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

/**
 * Detects if the current host is an Open Platform subdomain (open.* or beta.*)
 */
function isOpenPlatformHost(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.toLowerCase();
  return hostname.startsWith("open.") || hostname.startsWith("beta.");
}

/**
 * Returns the normalized pathname for Open platform routes.
 *
 * On open.medlyai.com or beta.medlyai.com, the browser pathname is `/` or `/doc/123`,
 * but internally we use `/open` or `/open/doc/123`. This hook normalizes the pathname
 * to always include the `/open` prefix when on an Open platform subdomain.
 */
export function useOpenPathname(): string {
  const pathname = usePathname();

  return useMemo(() => {
    // On Open platform subdomains, prefix pathname with /open if not already present
    if (isOpenPlatformHost() && !pathname.startsWith("/open")) {
      return pathname === "/" ? "/open" : `/open${pathname}`;
    }
    return pathname;
  }, [pathname]);
}
