import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/toaster";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { WebSocketProvider } from "@/components/providers/websocket-provider";
import ErrorBoundary from "@/components/error-boundary";

// Import health monitor to activate it
import "./lib/health-monitor";

// Set up the page title
document.title = "AI Receptionist System";

// Create a meta tag for description
const metaDescription = document.createElement("meta");
metaDescription.name = "description";
metaDescription.content = "AI Receptionist System - Automated communication across multiple channels";
document.head.appendChild(metaDescription);

// Create a favicon link
const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232563eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 01-.659 1.591L9 14.5m0 0l3-3m-3 3l-3-3m12 1.5v-5.5a2.25 2.25 0 00-.659-1.591L18 6.5m-6-3V3m0 0a2.25 2.25 0 012.25 2.25M12 3v3'/%3E%3C/svg%3E";
document.head.appendChild(favicon);

// Create a new link element for the Google Fonts
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";
document.head.appendChild(fontLink);

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <WebSocketProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster />
    </WebSocketProvider>
  </QueryClientProvider>
);
