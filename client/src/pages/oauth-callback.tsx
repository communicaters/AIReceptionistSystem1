/**
 * Google OAuth Callback Handler
 * This page handles the OAuth callback and communicates the result to the parent window.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Parse query parameters
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    
    // Determine status based on URL parameters
    if (connected === 'true') {
      setStatus('success');
      
      // Notify parent window that authentication was successful
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'GOOGLE_OAUTH_SUCCESS' 
        }, window.location.origin);
        
        // Close the popup window after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      }
    } else if (error) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(error));
      
      // Notify parent window about the error
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'GOOGLE_OAUTH_ERROR', 
          error: decodeURIComponent(error) 
        }, window.location.origin);
        
        // Keep the window open for a bit longer so user can see the error
        setTimeout(() => {
          window.close();
        }, 5000);
      }
    }
  }, []);
  
  // If this page is not opened in a popup, provide navigation
  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      setLocation('/calendar');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-[350px] shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            Google Calendar Connection
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Processing your request...'}
            {status === 'success' && 'Successfully connected!'}
            {status === 'error' && 'Connection failed'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          {status === 'loading' && (
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
          )}
          
          {status === 'success' && (
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <p className="text-red-500 text-center mb-4">
                {errorMessage || 'An unknown error occurred'}
              </p>
            </>
          )}
          
          <Button 
            onClick={handleClose}
            className="mt-4"
            variant={status === 'error' ? 'destructive' : 'default'}
          >
            {window.opener ? 'Close Window' : 'Return to Calendar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}