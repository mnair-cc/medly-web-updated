"use client";

import { useEffect } from "react";

export function ReferrerHandler() {
  useEffect(() => {
    // Handle referrer ID from OAuth callback URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");

    if (ref) {
      // Set the referrer ID cookie
      const domain = window.location.hostname.split(".").slice(-2).join(".");
      document.cookie = `referrerId=${ref}; path=/; domain=.${domain}; max-age=2592000`; // 30 days expiry

      // Clean up the URL by removing the ref parameter
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState(
        {},
        document.title,
        url.pathname + url.search
      );
    }
  }, []);

  return null; // This component doesn't render anything
}
