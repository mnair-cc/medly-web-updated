'use client'

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { trackUserEvent as trackEvent } from "./analytics";
import { sendFacebookConversionEvent } from "../pixels/facebook";
import { sendTikTokConversionEvent } from "../pixels/tiktok";
import { canTrackUser } from "../utils/consent";

// Add TikTok and Snapchat tracking type declarations
declare global {
  interface Window {
    ttq?: {
      track: (event: string, properties?: Record<string, any>) => void;
    };
    // Snapchat pixel is a callable function, not an object with methods
    // Usage: snaptr('track', 'EVENT_NAME', { ...properties })
    snaptr?: (action: string, event: string, properties?: Record<string, any>) => void;
  }
}

export function useTracking() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const track = useCallback(async (
    eventName: string,
    properties: Record<string, any> = {}
  ) => {
    // Check consent for marketing tracking (Facebook/TikTok)
    const hasMarketingConsent = canTrackUser();

    // Always track with PostHog for product analytics (not affected by marketing consent)
    if (userId) {
      await trackEvent(userId, eventName, properties);
    }

    // Track with TikTok pixel if available and consent given
    if (hasMarketingConsent && typeof window !== 'undefined' && window.ttq?.track) {
      try {
        window.ttq.track(eventName, properties);

        if (eventName === "practice_submit_answer") {
          window.ttq.track('SubmitForm', {});
        }
      } catch (error) {
        console.error("Failed to track TikTok pixel event:", error);
      }
    }

    // Track with Snapchat pixel if available and consent given
    // Snapchat pixel uses functional API: snaptr('track', eventName, properties)
    if (hasMarketingConsent && typeof window !== 'undefined' && typeof window.snaptr === 'function') {
      try {
        window.snaptr('track', eventName, properties);

        if (eventName === "practice_submit_answer") {
          window.snaptr('track', 'VIEW_CONTENT', properties);
        }
      } catch (error) {
        console.error("Failed to track Snapchat pixel event:", error);
      }
    }

    // Send Facebook conversion event only with marketing consent
    if (hasMarketingConsent) {
      try {
        const userData = {
          em: session?.user?.email ? [session.user.email] : [],
        };

        await sendFacebookConversionEvent(
          eventName,
          userData,
          properties,
          typeof window !== 'undefined' ? window.location.href : ''
        );
      } catch (error) {
        console.error("Failed to send Facebook conversion event:", error);
      }
    }

    // Send TikTok server-side conversion event only with marketing consent
    if (hasMarketingConsent) {
      try {
        const tiktokUserData = {
          email: session?.user?.email || null,
        };

        // Event ID will be generated securely on the server side
        await sendTikTokConversionEvent(
          eventName,
          tiktokUserData,
          properties,
          typeof window !== 'undefined' ? window.location.href : ''
        );
      } catch (error) {
        console.error("Failed to send TikTok conversion event:", error);
      }
    }
  }, [userId, session?.user?.email]);

  return { track };
} 