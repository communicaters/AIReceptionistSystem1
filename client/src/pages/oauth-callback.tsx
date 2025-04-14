/**
 * Google OAuth Callback Handler
 * This page handles the OAuth callback and communicates the result to the parent window.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // Parse query parameters to check for success or failure
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');

    if (connected === 'true') {
      setStatus("success");
      
      // Notify the opener window of successful authentication
      if (window.opener && window.opener.postMessage) {
        window.opener.postMessage(
          { type: "GOOGLE_OAUTH_SUCCESS" }, 
          window.location.origin
        );
      }
      
      // Close the popup window automatically after a short delay
      setTimeout(() => {
        window.close();
      }, 2000);
    } else if (error) {
      setStatus("error");
      setErrorMessage(error);
      
      // Notify the opener window of the authentication error
      if (window.opener && window.opener.postMessage) {
        window.opener.postMessage(
          { type: "GOOGLE_OAUTH_ERROR", error }, 
          window.location.origin
        );
      }
      
      // Close the popup window automatically after a short delay
      setTimeout(() => {
        window.close();
      }, 3000);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">
            {status === "processing" && "Connecting to Google..."}
            {status === "success" && "Google Account Connected"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          {status === "processing" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-center text-muted-foreground">
                Please wait while we complete the connection to your Google account...
              </p>
            </>
          )}
          
          {status === "success" && (
            <>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-center text-muted-foreground">
                Your Google Calendar account has been successfully connected.
              </p>
              <p className="text-center text-sm text-muted-foreground mt-4">
                This window will close automatically.
              </p>
            </>
          )}
          
          {status === "error" && (
            <>
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-center text-muted-foreground">
                An error occurred while connecting to Google Calendar.
              </p>
              {errorMessage && (
                <p className="text-center text-sm text-red-500 mt-2">
                  {errorMessage}
                </p>
              )}
              <p className="text-center text-sm text-muted-foreground mt-4">
                This window will close automatically.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}