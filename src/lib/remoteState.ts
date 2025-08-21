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
    // First, check if record exists
    const { data: existingData, error: selectError } = await supabase
      .from(TABLE)
      .select("id")
      .eq("user_id", userId)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 is "not found", which is expected for new users
      console.error("Error checking existing record:", selectError);
      return;
    }

    if (existingData) {
      // Record exists, update it
      console.log("Record exists, updating...");
      const { error: updateError } = await supabase
        .from(TABLE)
        .update({
          data: state,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating remote state:", updateError);
      } else {
        console.log("Remote state updated successfully");
      }
    } else {
      // Record doesn't exist, insert it
      console.log("Record doesn't exist, inserting...");
      const { error: insertError } = await supabase.from(TABLE).insert({
        user_id: userId,
        data: state,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Error inserting remote state:", insertError);
      } else {
        console.log("Remote state inserted successfully");
      }
    }
  } catch (err) {
    console.error("Exception saving remote state:", err);
  }
}
