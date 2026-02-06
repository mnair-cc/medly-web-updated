// Circuit breaker state
let consecutiveFailures = 0;
let circuitOpenUntil: number | null = null;

const MAX_FAILURES = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function isCircuitOpen(): boolean {
  if (!circuitOpenUntil) return false;
  if (Date.now() > circuitOpenUntil) {
    circuitOpenUntil = null;
    consecutiveFailures = 0;
    return false;
  }
  return true;
}

export async function sendTikTokConversionEvent(
  eventName: string,
  userData: any,
  customData: any,
  eventSourceUrl: string
) {
  // Skip if circuit is open
  if (isCircuitOpen()) {
    return null;
  }

  try {
    const response = await fetch('/api/tiktok-conversion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        userData,
        customData,
        eventSourceUrl,
      }),
    });

    if (!response.ok) {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_FAILURES) {
        circuitOpenUntil = Date.now() + COOLDOWN_MS;
      }
      const errorData = await response.json().catch(() => null);
      console.error('TikTok conversion event failed:', {
        status: response.status,
        error: errorData,
      });
      return null;
    }

    // Success - reset circuit breaker
    consecutiveFailures = 0;
    circuitOpenUntil = null;
    return await response.json();
  } catch (error) {
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_FAILURES) {
      circuitOpenUntil = Date.now() + COOLDOWN_MS;
    }
    console.error('Error sending TikTok conversion event:', error);
    return null;
  }
}