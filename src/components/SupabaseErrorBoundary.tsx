"use client";

import React, { Component, ReactNode } from "react";
import NetworkErrorRecovery from "./NetworkErrorRecovery";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export default class SupabaseErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a Supabase/network related error
    const isNetworkError =
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("NetworkError") ||
      error.message?.includes("fetch") ||
      error.name === "TypeError";

    if (isNetworkError) {
      return {
        hasError: true,
        error,
        errorInfo: "Network connection error detected",
      };
    }

    // For other errors, don't catch them
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("SupabaseErrorBoundary caught an error:", error, errorInfo);

    // Log the error for debugging
    if (error.message?.includes("Failed to fetch")) {
      console.log("This appears to be a Supabase connectivity issue");
      console.log("Stack trace:", error.stack);
      console.log("Component stack:", errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      // Show custom fallback UI or the NetworkErrorRecovery component
      return this.props.fallback || <NetworkErrorRecovery />;
    }

    return this.props.children;
  }
}
