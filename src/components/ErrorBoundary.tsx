"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React errors and displays a fallback UI
 *
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you could send to error tracking service (Sentry, etc.)
    if (process.env.NODE_ENV === "production") {
      // Example: sendToErrorTracking(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.resetError
        );
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
}

/**
 * Default Error Fallback UI
 */
function DefaultErrorFallback({ error, errorInfo, resetError }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/90 backdrop-blur-sm border-2 border-rose-300 rounded-2xl shadow-xl p-6 sm:p-8">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-rose-100 rounded-full mx-auto mb-4">
          <svg
            className="w-8 h-8 text-rose-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h1 className="text-2xl sm:text-3xl font-semibold text-rose-900 text-center mb-2">
          Oops! Something went wrong
        </h1>

        <p className="text-sm text-rose-700 text-center mb-6">
          We encountered an unexpected error. Don&apos;t worry, your data is safe.
        </p>

        {/* Error Message */}
        <div className="bg-rose-50 border-2 border-rose-200 rounded-lg p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-rose-600 font-semibold mb-2">
            Error Details
          </p>
          <p className="text-sm text-rose-900 font-mono break-words">
            {error.message || "An unknown error occurred"}
          </p>
        </div>

        {/* Stack Trace (Development Only) */}
        {isDevelopment && errorInfo && (
          <details className="mb-6">
            <summary className="cursor-pointer text-sm text-rose-700 hover:text-rose-900 font-semibold mb-2">
              Show Technical Details
            </summary>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 max-h-64 overflow-auto">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words font-mono">
                {errorInfo.componentStack}
              </pre>
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
            className="px-6 py-3 bg-rose-300 text-rose-900 text-sm font-semibold rounded-lg hover:bg-rose-400 transition-all duration-200 shadow-sm"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = "/"}
            className="px-6 py-3 border-2 border-rose-200 text-rose-800 text-sm font-semibold rounded-lg hover:border-rose-300 hover:bg-rose-50 transition-all duration-200"
          >
            Go to Dashboard
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-rose-600 text-center mt-6">
          If this problem persists, please refresh the page or contact support.
        </p>
      </div>
    </div>
  );
}

/**
 * Compact Error Fallback for smaller sections
 */
export function CompactErrorFallback({ error, resetError }: Omit<ErrorFallbackProps, "errorInfo">) {
  return (
    <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-6 text-center">
      <div className="flex items-center justify-center w-12 h-12 bg-rose-100 rounded-full mx-auto mb-3">
        <svg
          className="w-6 h-6 text-rose-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-rose-900 mb-2">
        Something went wrong
      </h3>
      <p className="text-sm text-rose-700 mb-4">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={resetError}
        className="px-4 py-2 bg-rose-300 text-rose-900 text-sm font-semibold rounded-lg hover:bg-rose-400 transition-all duration-200"
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Hook to use error boundary in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}
