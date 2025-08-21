import { createClient } from "@supabase/supabase-js";

let _supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log("Supabase environment check:", { 
    hasUrl: !!url, 
    hasKey: !!key,
    url: url?.substring(0, 30) + "..." 
  });
  
  if (!url || !key) {
    console.error("Supabase not configured - missing environment variables");
    return null;
  }
  
  if (!_supabaseClient) {
    _supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.log("Supabase client created successfully");
  }
  
  return _supabaseClient;
}

// Export a getter function instead of singleton
export const supabase = getSupabaseClient();
