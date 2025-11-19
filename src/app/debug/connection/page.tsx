"use client";

import { useState } from "react";
import { testSupabaseConnection } from "@/lib/supabaseClient";
import {
  checkNetworkConnectivity,
  clearSupabaseAuthState,
} from "@/lib/networkUtils";
import { Button, Card } from "@/components/UI";

export default function ConnectionDebug() {
  const [results, setResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addResult = (message: string) => {
    setResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const runDiagnostics = async () => {
    setTesting(true);
    setResults([]);

    addResult("🔍 Starting connection diagnostics...");

    // Test 1: Basic network connectivity
    addResult("1. Testing basic network connectivity...");
    try {
      const networkOk = await checkNetworkConnectivity();
      addResult(
        networkOk
          ? "✅ Network connectivity: OK"
          : "❌ Network connectivity: Failed"
      );
    } catch (error) {
      addResult("❌ Network test failed: " + (error as Error).message);
    }

    // Test 2: Environment variables
    addResult("2. Checking environment variables...");
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    addResult(hasUrl ? "✅ Supabase URL: Present" : "❌ Supabase URL: Missing");
    addResult(hasKey ? "✅ Supabase Key: Present" : "❌ Supabase Key: Missing");

    // Test 3: Supabase connection
    if (hasUrl && hasKey) {
      addResult("3. Testing Supabase connection...");
      try {
        const supabaseOk = await testSupabaseConnection();
        addResult(
          supabaseOk
            ? "✅ Supabase connection: OK"
            : "❌ Supabase connection: Failed"
        );
      } catch (error) {
        addResult("❌ Supabase test failed: " + (error as Error).message);
      }
    } else {
      addResult("❌ Skipping Supabase test (missing env vars)");
    }

    // Test 4: Local storage
    addResult("4. Testing local storage...");
    try {
      localStorage.setItem("test", "test");
      localStorage.removeItem("test");
      addResult("✅ Local storage: OK");
    } catch (error) {
      addResult("❌ Local storage failed: " + (error as Error).message);
    }

    addResult("🏁 Diagnostics complete!");
    setTesting(false);
  };

  const clearCache = () => {
    try {
      clearSupabaseAuthState();
      localStorage.removeItem("coop-tracker-state");
      sessionStorage.clear();
      addResult("✅ Cache and auth state cleared successfully");
    } catch (error) {
      addResult("❌ Failed to clear cache: " + (error as Error).message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">🔧 Connection Diagnostics</h1>

        <div className="space-y-4 mb-6">
          <Button
            onClick={runDiagnostics}
            disabled={testing}
            className="mr-4"
            variant="primary"
          >
            {testing ? "Running Tests..." : "🚀 Run Diagnostics"}
          </Button>

          <Button onClick={clearCache} variant="secondary" className="mr-4">
            🗑️ Clear Cache & Auth State
          </Button>

          <Button onClick={() => window.location.reload()} variant="secondary">
            🔄 Refresh Page
          </Button>
        </div>

        {results.length > 0 && (
          <Card className="p-4 bg-gray-50">
            <h2 className="font-semibold mb-2">Diagnostic Results:</h2>
            <div className="space-y-1 font-mono text-sm max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`${
                    result.includes("✅")
                      ? "text-green-600"
                      : result.includes("❌")
                      ? "text-red-600"
                      : result.includes("🔍") || result.includes("🏁")
                      ? "text-blue-600 font-bold"
                      : "text-gray-700"
                  }`}
                >
                  {result}
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Common Issues & Solutions:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Failed to fetch:</strong> Usually caused by corrupted auth
              tokens - try &quot;Clear Cache & Auth State&quot;
            </li>
            <li>
              <strong>Network Error:</strong> Check your internet connection or
              firewall settings
            </li>
            <li>
              <strong>Missing env vars:</strong> Make sure your .env.local file
              has valid Supabase credentials
            </li>
            <li>
              <strong>CORS Error:</strong> Supabase project settings may need to
              be updated
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
