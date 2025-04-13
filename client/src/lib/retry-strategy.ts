/**
 * A robust retry strategy with exponential backoff for network operations
 */
export class RetryStrategy {
  private maxAttempts: number;
  private baseDelay: number;
  private maxDelay: number;
  private jitter: boolean;
  private attempts: number = 0;
  private isExecuting: boolean = false;
  private abortController: AbortController | null = null;

  /**
   * Creates a new RetryStrategy
   * @param maxAttempts Maximum number of retry attempts
   * @param baseDelay Base delay in milliseconds
   * @param maxDelay Maximum delay in milliseconds
   * @param jitter Whether to add random jitter to delay
   */
  constructor(
    maxAttempts: number = 5,
    baseDelay: number = 1000,
    maxDelay: number = 30000,
    jitter: boolean = true
  ) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.jitter = jitter;
  }

  /**
   * Executes an operation with retries
   * @param operation Function to execute
   * @param onRetry Optional callback for retry events
   * @returns Promise resolving to operation result
   */
  async execute<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, delay: number, error: Error) => void
  ): Promise<T> {
    if (this.isExecuting) {
      throw new Error("Retry strategy is already executing an operation");
    }

    this.isExecuting = true;
    this.attempts = 0;
    this.abortController = new AbortController();

    try {
      while (this.attempts < this.maxAttempts && !this.abortController.signal.aborted) {
        try {
          const result = await operation();
          this.reset();
          return result;
        } catch (error) {
          this.attempts++;
          
          if (this.attempts >= this.maxAttempts) {
            throw error;
          }
          
          const delay = this.calculateDelay();
          
          if (onRetry && error instanceof Error) {
            onRetry(this.attempts, delay, error);
          }
          
          await this.wait(delay);
        }
      }
      
      throw new Error("Operation aborted");
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Aborts the current operation
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Resets the retry strategy
   */
  reset(): void {
    this.attempts = 0;
    this.isExecuting = false;
    this.abortController = null;
  }

  /**
   * Calculates delay using exponential backoff with optional jitter
   */
  private calculateDelay(): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, this.attempts - 1);
    const delay = Math.min(exponentialDelay, this.maxDelay);
    
    if (this.jitter) {
      // Add random jitter between 0-25% to prevent thundering herd
      const jitterAmount = delay * 0.25 * Math.random();
      return delay + jitterAmount;
    }
    
    return delay;
  }

  /**
   * Waits for specified delay, can be aborted
   */
  private wait(delay: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(resolve, delay);
      
      if (this.abortController) {
        this.abortController.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          resolve();
        });
      }
    });
  }
}