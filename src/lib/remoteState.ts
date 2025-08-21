import { getSupabaseClient } from "./supabaseClient";
import type { CoopState } from "@/types";

const TABLE = "coop_state";
const ROW_ID = "default";

export async function loadRemoteState(): Promise<CoopState | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("id", ROW_ID)
    .single();
  if (error) return null;
  return (data?.data as CoopState) ?? null;
}

export async function saveRemoteState(state: CoopState): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.from(TABLE).upsert({ id: ROW_ID, data: state });
}
