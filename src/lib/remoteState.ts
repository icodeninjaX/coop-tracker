import { getSupabaseClient } from "./supabaseClient";
import type { CoopState } from "@/types";

const TABLE = "coop_state";

export async function loadRemoteState(
  userId?: string
): Promise<CoopState | null> {
  const supabase = getSupabaseClient();

  if (!supabase || !userId) {
    console.log("loadRemoteState: No supabase client or userId", {
      supabase: !!supabase,
      userId,
    });
    return null;
  }

  console.log("Loading remote state for user:", userId);

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        console.log("No remote state found for user (new user)");
      } else {
        console.error("Error loading remote state:", error);
      }
      return null;
    }

    console.log("Loaded remote state successfully:", data);
    return (data?.data as CoopState) ?? null;
  } catch (err) {
    console.error("Exception loading remote state:", err);
    return null;
  }
}

export async function saveRemoteState(
  state: CoopState,
  userId?: string
): Promise<void> {
  const supabase = getSupabaseClient();

  if (!supabase || !userId) {
    console.log("saveRemoteState: No supabase client or userId", {
      supabase: !!supabase,
      userId,
    });
    return;
  }

  console.log("Saving remote state for user:", userId);

  try {
    // Use upsert instead of separate check and insert/update
    const { error } = await supabase.from(TABLE).upsert(
      {
        user_id: userId,
        data: state,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error("Error saving remote state:", error);
      throw error;
    } else {
      console.log("Remote state saved successfully");
    }
  } catch (err) {
    console.error("Exception saving remote state:", err);
    throw err;
  }
}
