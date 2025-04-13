/**
 * Utility to monitor application health and perform auto-recovery
 */

import { websocketService } from './websocket';
import { toast } from '@/hooks/use-toast';

// Health check intervals in milliseconds
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const MAX_ERRORS_BEFORE_RECOVERY = 5;
const ERROR_RESET_INTERVAL = 300000; // 5 minutes

interface HealthStatus {
  websocketErrors: number;
  apiErrors: number;
  lastApiErrorTime: number;
  lastWebsocketErrorTime: number;
  lastResetTime: number;
  isMonitoring: boolean;
}

class HealthMonitor {
  private status: HealthStatus;
  private interval: NodeJS.Timeout | null = null;
  private errorResetInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.status = {
      websocketErrors: 0,
      apiErrors: 0,
      lastApiErrorTime: 0,
      lastWebsocketErrorTime: 0,
      lastResetTime: Date.now(),
      isMonitoring: false
    };
  }

  /**
   * Start monitoring application health
   */
  public startMonitoring(): void {
    if (this.status.isMonitoring) {
      return;
    }

    console.log('Starting application health monitoring');
    this.status.isMonitoring = true;

    // Perform regular health checks
    this.interval = setInterval(() => {
      this.checkHealth();
    }, HEALTH_CHECK_INTERVAL);

    // Reset error counters periodically
    this.errorResetInterval = setInterval(() => {
      this.resetErrorCounters();
    }, ERROR_RESET_INTERVAL);

    // Setup global error handler
    this.setupGlobalErrorHandler();
  }

  /**
   * Stop monitoring application health
   */
  public stopMonitoring(): void {
    if (!this.status.isMonitoring) {
      return;
    }

    console.log('Stopping application health monitoring');
    this.status.isMonitoring = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.errorResetInterval) {
      clearInterval(this.errorResetInterval);
      this.errorResetInterval = null;
    }
  }

  /**
   * Record a WebSocket error
   */
  public recordWebsocketError(): void {
    this.status.websocketErrors++;
    this.status.lastWebsocketErrorTime = Date.now();
    this.checkRecoveryNeeded();
  }

  /**
   * Record an API error
   */
  public recordApiError(): void {
    this.status.apiErrors++;
    this.status.lastApiErrorTime = Date.now();
    this.checkRecoveryNeeded();
  }

  /**
   * Check if recovery is needed based on error thresholds
   */
  private checkRecoveryNeeded(): void {
    // Check if we need to recover the WebSocket
    if (this.status.websocketErrors >= MAX_ERRORS_BEFORE_RECOVERY) {
      this.recoverWebsocket();
    }

    // Check if we need a full page reload
    if (this.status.apiErrors >= MAX_ERRORS_BEFORE_RECOVERY) {
      this.recoverApplication();
    }
  }

  /**
   * Reset error counters
   */
  private resetErrorCounters(): void {
    const now = Date.now();
    console.log(`Resetting error counters. Previous counts - WebSocket: ${this.status.websocketErrors}, API: ${this.status.apiErrors}`);
    
    this.status.websocketErrors = 0;
    this.status.apiErrors = 0;
    this.status.lastResetTime = now;
  }

  /**
   * Perform health checks
   */
  private checkHealth(): void {
    // Check WebSocket connection
    if (!websocketService.isConnected()) {
      console.log('Health check: WebSocket disconnected, attempting reconnect');
      websocketService.connect();
    }

    // Add other health checks as needed
  }

  /**
   * Recover WebSocket connection
   */
  private recoverWebsocket(): void {
    console.log('Recovering WebSocket connection after multiple errors');
    toast({
      title: 'Connection Issue Detected',
      description: 'Automatically reconnecting to the server...',
      variant: 'default',
    });

    // Force reconnection
    websocketService.disconnect();
    setTimeout(() => {
      websocketService.connect();
    }, 1000);

    // Reset the counter
    this.status.websocketErrors = 0;
  }

  /**
   * Recover the entire application if needed
   */
  private recoverApplication(): void {
    console.log('Critical error threshold reached, suggesting page reload');
    
    toast({
      title: 'Application Error',
      description: 'Multiple errors detected. Please refresh the page if problems persist.',
      variant: 'destructive',
    });

    // Reset the counter
    this.status.apiErrors = 0;
  }

  /**
   * Setup global error handler
   */
  private setupGlobalErrorHandler(): void {
    if (typeof window !== 'undefined') {
      // Capture unhandled errors
      window.addEventListener('error', (event) => {
        console.error('Global error:', event.error || event.message);
        this.recordApiError();
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        this.recordApiError();
      });
    }
  }
}

// Create singleton instance
export const healthMonitor = new HealthMonitor();

// Start monitoring when this module is imported
if (typeof window !== 'undefined') {
  // Wait for page to fully load before starting
  window.addEventListener('load', () => {
    healthMonitor.startMonitoring();
  });
}