// Network utility to handle Supabase connectivity issues
export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Try to fetch a simple resource to check connectivity
    await fetch("https://httpbin.org/status/200", {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-cache",
    });
    return true;
  } catch (error) {
    console.log("Network connectivity check failed:", error);
    return false;
  }
}

export function isSupabaseError(error: unknown): boolean {
  const err = error as { message?: string; name?: string; code?: string };
  return (
    err?.message?.includes("Failed to fetch") ||
    err?.name === "TypeError" ||
    err?.code === "NETWORK_ERROR"
  );
}

// Fallback to localStorage when Supabase is unavailable
export function getLocalStorageState(): unknown {
  try {
    const stored = localStorage.getItem("coop-tracker-state");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to read from localStorage:", error);
    return null;
  }
}

export function setLocalStorageState(state: unknown): void {
  try {
    localStorage.setItem("coop-tracker-state", JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

// Clear any corrupted auth state
export function clearSupabaseAuthState(): void {
  try {
    // Clear localStorage items related to Supabase auth
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("supabase.auth.token") || key.includes("sb-"))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`Cleared corrupted auth state: ${key}`);
    });
  } catch (error) {
    console.error("Failed to clear auth state:", error);
  }
}
