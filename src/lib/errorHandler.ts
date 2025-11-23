/**
 * Centralized error handling utilities
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public isOperational = true
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string = "Network request failed") {
    super(message, "NETWORK_ERROR", 0);
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTH_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

/**
 * Error handler for async operations
 * Returns [error, null] on failure, [null, data] on success
 */
export async function handleAsync<T>(
  promise: Promise<T>
): Promise<[Error, null] | [null, T]> {
  try {
    const data = await promise;
    return [null, data];
  } catch (error) {
    if (error instanceof Error) {
      return [error, null];
    }
    return [new Error("Unknown error occurred"), null];
  }
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "An unknown error occurred";
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): {
  title: string;
  message: string;
  action?: string;
} {
  if (error instanceof ValidationError) {
    return {
      title: "Validation Error",
      message: error.message,
      action: "Please check your input and try again",
    };
  }

  if (error instanceof NetworkError) {
    return {
      title: "Connection Error",
      message: "Unable to connect to the server",
      action: "Check your internet connection and try again",
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      title: "Authentication Required",
      message: error.message,
      action: "Please log in to continue",
    };
  }

  if (error instanceof NotFoundError) {
    return {
      title: "Not Found",
      message: error.message,
      action: "The requested resource could not be found",
    };
  }

  if (error instanceof AppError) {
    return {
      title: "Error",
      message: error.message,
      action: "Please try again",
    };
  }

  return {
    title: "Unexpected Error",
    message: getErrorMessage(error),
    action: "An unexpected error occurred. Please try again.",
  };
}

/**
 * Log error to console (or external service in production)
 */
export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    context,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    url: typeof window !== "undefined" ? window.location.href : "unknown",
  };

  // Log to console
  console.error("Error logged:", errorInfo);

  // In production, send to error tracking service
  if (process.env.NODE_ENV === "production") {
    // Example: sendToSentry(errorInfo);
    // Example: sendToLogService(errorInfo);
  }
}

/**
 * Retry utility for failed operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, onRetry } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        if (onRetry) {
          onRetry(attempt, lastError);
        }
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError!;
}

/**
 * Debounced error logger to prevent spam
 */
const errorLogCache = new Map<string, number>();
const ERROR_LOG_THROTTLE = 5000; // 5 seconds

export function throttledLogError(error: unknown, context?: Record<string, unknown>) {
  const errorKey = getErrorMessage(error);
  const lastLogged = errorLogCache.get(errorKey);
  const now = Date.now();

  if (!lastLogged || now - lastLogged > ERROR_LOG_THROTTLE) {
    logError(error, context);
    errorLogCache.set(errorKey, now);
  }
}
