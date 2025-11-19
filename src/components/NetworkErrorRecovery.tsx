"use client";

import { useState } from "react";
import { clearSupabaseAuthState } from "@/lib/networkUtils";
import { Button } from "@/components/UI";

export default function NetworkErrorRecovery() {
  const [isClearing, setIsClearing] = useState(false);
  const [message, setMessage] = useState("");

  const handleClearAuthState = async () => {
    setIsClearing(true);
    setMessage("");

    try {
      // Clear corrupted auth state
      clearSupabaseAuthState();

      // Clear any cached state
      localStorage.removeItem("coop-tracker-state");
      sessionStorage.clear();

      setMessage(
        "✅ Auth state cleared successfully! Please refresh the page."
      );
    } catch (error) {
      setMessage(
        "❌ Failed to clear auth state. Please try refreshing the page manually."
      );
      console.error("Clear auth state error:", error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 m-4">
      <div className="text-center mb-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Connection Error
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          There seems to be a connection issue with the server. This is usually
          caused by corrupted authentication tokens.
        </p>
      </div>

      <div className="space-y-3 mb-4">
        <Button
          onClick={handleClearAuthState}
          disabled={isClearing}
          className="w-full"
          variant="primary"
        >
          {isClearing ? "Clearing..." : "🔧 Fix Connection Issue"}
        </Button>

        <Button onClick={handleRefresh} className="w-full" variant="secondary">
          🔄 Refresh Page
        </Button>
      </div>

      {message && (
        <div
          className={`text-sm p-3 rounded ${
            message.includes("✅")
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4">
        <p className="mb-2">
          <strong>What this does:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Clears corrupted authentication data</li>
          <li>Resets connection settings</li>
          <li>Allows fresh connection attempt</li>
        </ul>
      </div>
    </div>
  );
}
