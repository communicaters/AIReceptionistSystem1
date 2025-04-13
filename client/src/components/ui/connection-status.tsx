import { useEffect, useState } from "react";
import { useWebSocketContext } from "@/components/providers/websocket-provider";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ConnectionStatus() {
  const { connected, sessionId } = useWebSocketContext();
  const [isVisible, setIsVisible] = useState(false);
  
  // Only show the status indicator if the connection changes
  useEffect(() => {
    setIsVisible(true);
    
    // Hide the indicator after 5 seconds
    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [connected]);

  // Don't render until we have tried to connect at least once
  if (!sessionId && connected === false) {
    return null;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "fixed bottom-4 right-4 z-50 transition-opacity duration-500",
              isVisible ? "opacity-100" : "opacity-0"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
                connected
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              )}
            >
              {connected ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Disconnected</span>
                </>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          {connected
            ? "Connected to the server"
            : "Disconnected. Attempting to reconnect..."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}