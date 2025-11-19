import { createClient } from "@supabase/supabase-js";

let _supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log("Supabase environment check:", {
    hasUrl: !!url,
    hasKey: !!key,
    url: url?.substring(0, 30) + "...",
  });

  if (!url || !key) {
    console.error("Supabase not configured - missing environment variables");
    return null;
  }

  if (!_supabaseClient) {
    try {
      _supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false, // Disable session persistence to avoid refresh token issues
          autoRefreshToken: false, // Disable auto refresh to prevent network errors
          detectSessionInUrl: false, // Disable URL session detection
        },
        global: {
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      });
      console.log("Supabase client created successfully");
    } catch (error) {
      console.error("Failed to create Supabase client:", error);
      return null;
    }
  }

  return _supabaseClient;
}

// Test connectivity function
export async function testSupabaseConnection() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase client not available");
  }

  try {
    // Simple connectivity test - this doesn't require authentication
    const { error } = await client
      .from("test")
      .select("count", { count: "exact", head: true });
    if (error && error.code !== "PGRST116") {
      // PGRST116 means table doesn't exist, which is fine for connectivity test
      console.error("Supabase connectivity test failed:", error);
      return false;
    }
    console.log("Supabase connectivity test passed");
    return true;
  } catch (error) {
    console.error("Supabase connectivity error:", error);
    return false;
  }
}

// Export a getter function instead of singleton
export const supabase = getSupabaseClient();
