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
    // Window size and position
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // OAuth endpoint URL - this will be handled by our server-side route
    // Add prompt=select_account to force Google account selection
    // The redirect URI is fixed and must match what's in client_secret.json
    const url = '/api/calendar/auth?prompt=select_account';
    
    // Log that we're initiating the OAuth flow
    console.log('Initiating Google OAuth flow with redirect URI: https://6bdb745d-6f65-4b7e-940f-08efbdbcc0b7-00-1htwha895k1s8.kirk.replit.dev/api/calendar/auth');
    
    // Open the popup window
    const popup = window.open(
      url,
      'googleAuthPopup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );
    
    if (!popup) {
      reject(new Error('Failed to open popup. It may have been blocked by the browser.'));
      return;
    }
    
    // Check if popup was closed manually by the user
    const popupClosedChecker = setInterval(() => {
      if (popup.closed) {
        clearInterval(popupClosedChecker);
        reject(new Error('Authentication was canceled'));
      }
    }, 1000);
    
    // Listen for messages from the popup window
    const messageHandler = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }
      
      // Process the message
      if (event.data && event.data.type) {
        switch (event.data.type) {
          case 'GOOGLE_OAUTH_SUCCESS':
            clearInterval(popupClosedChecker);
            window.removeEventListener('message', messageHandler);
            resolve();
            break;
            
          case 'GOOGLE_OAUTH_ERROR':
            clearInterval(popupClosedChecker);
            window.removeEventListener('message', messageHandler);
            reject(new Error(event.data.error || 'Authentication failed'));
            break;
        }
      }
    };
    
    // Add the message listener
    window.addEventListener('message', messageHandler);
  });
}