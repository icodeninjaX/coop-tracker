/**
 * Emergency script to clear localStorage data that might be causing conflicts
 * Run this in browser console if you suspect localStorage is overwriting Supabase data
 */

// Clear all coop-related localStorage data
function clearCoopLocalStorage() {
  const keys = Object.keys(localStorage);
  const coopKeys = keys.filter(
    (key) => key.startsWith("coopState_") || key.startsWith("coopSeeded_")
  );

  console.log("Found coop localStorage keys:", coopKeys);

  coopKeys.forEach((key) => {
    localStorage.removeItem(key);
    console.log("Removed:", key);
  });

  console.log("Cleared all coop localStorage data. Please refresh the page.");
}

// Run it
clearCoopLocalStorage();
