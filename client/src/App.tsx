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

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import UserManagement from "@/pages/admin/users";
import PackagesManagement from "@/pages/admin/packages";
import ReportsManagement from "@/pages/admin/reports";
import UserPackageManagement from "@/pages/admin/user-packages";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { WebSocketProvider } from "@/components/providers/websocket-provider";
import { CallProvider } from "@/components/providers/call-provider";
import { AuthProvider, useAuth } from "@/components/providers/auth-provider";

import { ProtectedRoute } from "@/components/protected-route";

function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

function App() {
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
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/voice-call">
            <ProtectedRoute>
              <DashboardLayout>
                <VoiceCall />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/email-management">
            <ProtectedRoute>
              <DashboardLayout>
                <EmailManagement />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/live-chat">
            <ProtectedRoute>
              <DashboardLayout>
                <LiveChat />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/whatsapp">
            <ProtectedRoute>
              <DashboardLayout>
                <WhatsApp />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/calendar">
            <ProtectedRoute>
              <DashboardLayout>
                <Calendar />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/products">
            <ProtectedRoute>
              <DashboardLayout>
                <Products />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/ai-training">
            <ProtectedRoute>
              <DashboardLayout>
                <AITraining />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/ai-training/initialize">
            <ProtectedRoute>
              <AddInitialTrainingData />
            </ProtectedRoute>
          </Route>
          <Route path="/speech-engines">
            <ProtectedRoute>
              <DashboardLayout>
                <SpeechEngines />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/settings">
            <ProtectedRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          
          {/* Admin routes */}
          <Route path="/admin/dashboard">
            <ProtectedRoute requireAdmin={true}>
              <DashboardLayout>
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/admin/users">
            <ProtectedRoute requireAdmin={true}>
              <DashboardLayout>
                <UserManagement />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/admin/packages">
            <ProtectedRoute requireAdmin={true}>
              <DashboardLayout>
                <PackagesManagement />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/admin/reports">
            <ProtectedRoute requireAdmin={true}>
              <DashboardLayout>
                <ReportsManagement />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          <Route path="/admin/users/:id/packages">
            <ProtectedRoute requireAdmin={true}>
              <DashboardLayout>
                <UserPackageManagement />
              </DashboardLayout>
            </ProtectedRoute>
          </Route>
          
          <Route path="/oauth-callback" component={OAuthCallback} />
          <Route component={NotFound} />
        </Switch>
      </CallProvider>
    </WebSocketProvider>
  );
}

export default AppWithAuth;
