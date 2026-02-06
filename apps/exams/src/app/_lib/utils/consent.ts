// Client-side consent checking utility for marketing tracking (opt-out system)
// This only affects Facebook/TikTok marketing pixels, not PostHog product analytics
export function canTrackUser(): boolean {
  // Check browser privacy signals first (highest priority)
  if (typeof navigator !== 'undefined') {
    if (navigator.globalPrivacyControl) {
      return false;
    }
    
    if (navigator.doNotTrack === "1") {
      return false;
    }
  }
  
  // Check CookieScript consent
  try {
    // First, try to get consent from CookieScript's API if available
    if (typeof window !== 'undefined' && window.CookieScript?.instance?.currentState) {
      const currentState = window.CookieScript.instance.currentState();
      
      if (currentState) {
        // In opt-out system: allow unless explicitly disabled
        const isBlocked = currentState.targeting === false || 
                         currentState.marketing === false || 
                         currentState.advertisement === false;
        
        return !isBlocked;
      }
    }
    
    // Fallback to cookie check
    if (typeof document !== 'undefined') {
      const cookie = document.cookie.split(';')
        .find(c => c.trim().startsWith('CookieScriptConsent='));
      
      if (cookie) {
        try {
          const consent = JSON.parse(decodeURIComponent(cookie.split('=')[1]));
          
          // In opt-out system: only block if explicitly rejected
          if (consent.action === 'reject') {
            return false;
          }
          
          // Check if marketing/targeting categories are explicitly disabled
          if (consent.categories && Array.isArray(consent.categories)) {
            // If categories exist but don't include marketing/targeting, it's blocked
            const hasMarketingConsent = consent.categories.includes('targeting') ||
                                      consent.categories.includes('marketing') ||
                                      consent.categories.includes('advertisement');
            
            // If only necessary cookies are allowed, block tracking
            if (consent.categories.length === 1 && consent.categories.includes('necessary')) {
              return false;
            }
            
            return hasMarketingConsent;
          }
          
          // Default allow if no explicit rejection
          return true;
        } catch (parseError) {
          return true; // Default allow on parse error
        }
      }
    }
    
    // Default to allow tracking (opt-out system)
    return true;
    
  } catch (error) {
    return true; // Default allow on error
  }
}

// Type declarations for CookieScript (for TypeScript)
declare global {
  interface Window {
    CookieScript?: {
      instance?: {
        currentState?: () => {
          targeting?: boolean;
          marketing?: boolean;
          advertisement?: boolean;
          necessary?: boolean;
          performance?: boolean;
        };
      };
    };
  }
  
  interface Navigator {
    globalPrivacyControl?: boolean;
  }
}