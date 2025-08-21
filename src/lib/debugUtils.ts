import { getSupabaseClient } from "./supabaseClient";

export async function clearUserData(userId: string) {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.error("Supabase not configured");
    return false;
  }

  try {
    console.log("Clearing data for user:", userId);
    
    // Delete from Supabase
    const { error } = await supabase
      .from('coop_state')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error clearing Supabase data:", error);
      return false;
    }
    
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(`coopState_${userId}`);
      localStorage.removeItem(`coopSeeded_${userId}`);
      console.log("Cleared localStorage data");
    }
    
    console.log("Successfully cleared all user data");
    return true;
  } catch (err) {
    console.error("Exception clearing user data:", err);
    return false;
  }
}

export async function debugUserData(userId: string) {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    console.error("Supabase not configured");
    return;
  }

  try {
    console.log("=== DEBUG USER DATA ===");
    console.log("User ID:", userId);
    
    // Check Supabase data
    const { data, error } = await supabase
      .from('coop_state')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error fetching Supabase data:", error);
    } else {
      console.log("Supabase records:", data?.length || 0);
      if (data && data.length > 0) {
        console.log("Latest record:", data[0]);
      }
    }
    
    // Check localStorage
    if (typeof window !== "undefined") {
      const localState = localStorage.getItem(`coopState_${userId}`);
      const seeded = localStorage.getItem(`coopSeeded_${userId}`);
      
      console.log("LocalStorage state exists:", !!localState);
      console.log("LocalStorage seeded flag:", seeded);
      
      if (localState) {
        const parsed = JSON.parse(localState);
        console.log("Local data summary:", {
          collections: parsed.collections?.length || 0,
          members: parsed.members?.length || 0,
          loans: parsed.loans?.length || 0,
        });
      }
    }
    
    console.log("=== END DEBUG ===");
  } catch (err) {
    console.error("Exception during debug:", err);
  }
}
