import { useState, useEffect } from 'react';

export function useTutorialTooltip(cookieName: string, dependsOn?: string) {
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const checkCookies = () => {
      const cookies = document.cookie.split('; ');
      const currentCookie = cookies.find(row => row.startsWith(`${cookieName}=`));
      
      // If this tooltip depends on another one
      if (dependsOn) {
        const dependentCookie = cookies.find(row => row.startsWith(`${dependsOn}=`));
        
        // Only show if the dependent tooltip was already shown and current one wasn't
        if (!currentCookie && dependentCookie) {
          setShowTooltip(true);
        } else {
          setShowTooltip(false);
        }
      } 
      // No dependency, just check if this tooltip was shown
      else if (!currentCookie) {
        setShowTooltip(true);
      } else {
        setShowTooltip(false);
      }
    };
    
    checkCookies();
  }, [cookieName, dependsOn]);

  const handleDismiss = () => {
    document.cookie = `${cookieName}=true; path=/; max-age=31536000`; // 1 year expiry
    setShowTooltip(false);
  };

  return { showTooltip, handleDismiss };
}