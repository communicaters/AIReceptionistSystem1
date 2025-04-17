import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import VoiceCall from "@/pages/voice-call";
import EmailManagement from "@/pages/email-management";
import LiveChat from "@/pages/live-chat";
import WhatsApp from "@/pages/whatsapp";
import Calendar from "@/pages/calendar";
import Products from "@/pages/products";
import AITraining from "@/pages/training";
import AddInitialTrainingData from "@/pages/add-initial-training-data";
import SpeechEngines from "@/pages/speech-engines";
import Settings from "@/pages/settings";
import OAuthCallback from "@/pages/oauth-callback";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { WebSocketProvider } from "@/components/providers/websocket-provider";
import { CallProvider } from "@/components/providers/call-provider";

function App() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on initial load and when location changes
  useEffect(() => {
    // Check if auth token exists in localStorage
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);

    // Redirect to login if not authenticated and not already on a public route
    if (!token && !isPublicRoute(location)) {
      setLocation('/login');
    }
  }, [location, setLocation]);

  // Define public routes that don't require authentication
  const isPublicRoute = (route: string) => {
    const publicRoutes = ['/login', '/register', '/reset-request', '/reset-password', '/verify-email'];
    return publicRoutes.some(r => route.startsWith(r));
  };

  return (
    <WebSocketProvider>
      <CallProvider>
        <ConnectionStatus />
        <Switch>
          {/* Public routes - accessible without authentication */}
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          
          {/* Protected routes - require authentication */}
          <Route path="/">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/voice-call">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <VoiceCall />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/email-management">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <EmailManagement />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/live-chat">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <LiveChat />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/whatsapp">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <WhatsApp />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/calendar">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <Calendar />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/products">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <Products />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/ai-training">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <AITraining />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/ai-training/initialize">
            {() => isAuthenticated ? <AddInitialTrainingData /> : null}
          </Route>
          <Route path="/speech-engines">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <SpeechEngines />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/settings">
            {() => isAuthenticated ? (
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            ) : null}
          </Route>
          <Route path="/oauth-callback" component={OAuthCallback} />
          <Route component={NotFound} />
        </Switch>
      </CallProvider>
    </WebSocketProvider>
  );
}

export default App;
