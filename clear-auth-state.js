// Run this in the browser console to clear Supabase auth state
// This will help resolve "Failed to fetch" errors related to token refresh

console.log("Clearing Supabase authentication state...");

// Clear localStorage items related to Supabase
const keysToRemove = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes("supabase") || key.includes("auth"))) {
    keysToRemove.push(key);
  }
}

keysToRemove.forEach((key) => {
  localStorage.removeItem(key);
  console.log(`Removed: ${key}`);
});

// Clear sessionStorage items related to Supabase
const sessionKeysToRemove = [];
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  if (key && (key.includes("supabase") || key.includes("auth"))) {
    sessionKeysToRemove.push(key);
  }
}

sessionKeysToRemove.forEach((key) => {
  sessionStorage.removeItem(key);
  console.log(`Removed from session: ${key}`);
});

console.log("Supabase auth state cleared. Please refresh the page.");
