import { Switch, Route } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
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
  return (
    <WebSocketProvider>
      <CallProvider>
        <ConnectionStatus />
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/voice-call">
            {() => (
              <DashboardLayout>
                <VoiceCall />
              </DashboardLayout>
            )}
          </Route>
        <Route path="/email-management">
          {() => (
            <DashboardLayout>
              <EmailManagement />
            </DashboardLayout>
          )}
        </Route>
        <Route path="/live-chat">
          {() => (
            <DashboardLayout>
              <LiveChat />
            </DashboardLayout>
          )}
        </Route>
        <Route path="/whatsapp">
          {() => (
            <DashboardLayout>
              <WhatsApp />
            </DashboardLayout>
          )}
        </Route>
        <Route path="/calendar">
          {() => (
            <DashboardLayout>
              <Calendar />
            </DashboardLayout>
          )}
        </Route>
        <Route path="/products">
          {() => (
            <DashboardLayout>
              <Products />
            </DashboardLayout>
          )}
        </Route>
        <Route path="/ai-training">
          {() => (
            <DashboardLayout>
              <AITraining />
            </DashboardLayout>
          )}
        </Route>
        <Route path="/ai-training/initialize" component={AddInitialTrainingData} />
        <Route path="/speech-engines">
          {() => (
            <DashboardLayout>
              <SpeechEngines />
            </DashboardLayout>
          )}
        </Route>
        <Route path="/settings">
          {() => (
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          )}
        </Route>
        <Route path="/oauth-callback" component={OAuthCallback} />
        <Route component={NotFound} />
      </Switch>
      </CallProvider>
    </WebSocketProvider>
  );
}

export default App;
