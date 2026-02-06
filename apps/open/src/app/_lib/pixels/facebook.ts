export async function sendFacebookConversionEvent(
  eventName: string,
  userData: any,
  customData: any,
  eventSourceUrl: string
) {
  try {
    const response = await fetch('/api/facebook-conversion', {
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
    
    return await response.json();
  } catch (error) {
    console.error('Error sending Facebook conversion event:', error);
    return null;
  }
} 