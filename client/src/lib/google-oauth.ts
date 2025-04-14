/**
 * Google OAuth Popup Handler
 * This file contains utility functions for handling Google OAuth flow in a popup window.
 */

/**
 * Opens the Google OAuth authorization page in a popup window
 * 
 * @returns Promise that resolves when the popup is closed with success or rejects on error/cancel
 */
export function openGoogleAuthPopup(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Google OAuth popup configuration
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;
    const url = "/api/calendar/auth/authorize";
    
    // Open popup window with specified dimensions and position
    const popup = window.open(
      url,
      "googleOAuth",
      `width=${width},height=${height},left=${left},top=${top},popup=true,menubar=no,toolbar=no,location=no,status=no`
    );
    
    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }
    
    // Check if popup was closed without completing the OAuth flow
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        clearInterval(checkConnected);
        reject(new Error("Authentication was cancelled."));
      }
    }, 500);
    
    // Setup message listener for OAuth completion
    const messageHandler = (event: MessageEvent) => {
      // Only accept messages from our application domain
      if (event.origin !== window.location.origin) return;
      
      // Check for OAuth success/error message
      if (event.data?.type === "GOOGLE_OAUTH_SUCCESS") {
        clearInterval(checkClosed);
        clearInterval(checkConnected);
        window.removeEventListener("message", messageHandler);
        if (popup && !popup.closed) popup.close();
        resolve();
      } else if (event.data?.type === "GOOGLE_OAUTH_ERROR") {
        clearInterval(checkClosed);
        clearInterval(checkConnected);
        window.removeEventListener("message", messageHandler);
        if (popup && !popup.closed) popup.close();
        reject(new Error(event.data.error || "Authentication failed."));
      }
    };
    
    window.addEventListener("message", messageHandler);
    
    // Poll the popup window's location to detect when it's redirected to the callback URL
    // This is a fallback mechanism since postMessage is more reliable
    const checkConnected = setInterval(() => {
      try {
        // This will throw an error when the popup is redirected to a different domain
        if (popup.location.href.includes("/api/calendar/auth/callback")) {
          // We've detected the callback page - wait for it to process and post a message
          // But we'll add a safety timeout in case the message never comes
          setTimeout(() => {
            clearInterval(checkClosed);
            clearInterval(checkConnected);
            window.removeEventListener("message", messageHandler);
            if (popup && !popup.closed) popup.close();
            
            // For safety, we'll complete the promise after giving ample time for the message to arrive
            resolve();
          }, 3000);
        }
      } catch (e) {
        // Cross-origin error - ignore as this is expected during the OAuth flow
      }
    }, 500);
  });
}