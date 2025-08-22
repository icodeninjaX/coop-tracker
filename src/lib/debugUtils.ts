export function debugDataPersistence() {
  console.group("🔍 Data Persistence Debug");

  if (typeof window === "undefined") {
    console.log("❌ Not in browser environment");
    console.groupEnd();
    return;
  }

  console.log("🌐 LocalStorage contents:");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes("coop") || key.includes("supabase"))) {
      const value = localStorage.getItem(key);
      console.log(
        `  ${key}:`,
        value?.substring(0, 100) + (value && value.length > 100 ? "..." : "")
      );
    }
  }

  console.log("📊 Coop State Keys:");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("coopState_")) {
      console.log(`  Found state for user: ${key.replace("coopState_", "")}`);
    }
    if (key?.startsWith("coopSeeded_")) {
      console.log(
        `  Found seed flag for user: ${key.replace("coopSeeded_", "")}`
      );
    }
  }

  console.groupEnd();
}

export function clearAllCoopData() {
  if (typeof window === "undefined") {
    console.log("❌ Not in browser environment");
    return;
  }

  console.log("🧹 Clearing all coop data from localStorage");

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith("coopState_") || key.startsWith("coopSeeded_"))
    ) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    console.log(`  Removed: ${key}`);
  });

  console.log(`✅ Cleared ${keysToRemove.length} coop data entries`);
}

export function testDataPersistence() {
  if (typeof window === "undefined") {
    console.log("❌ Not in browser environment");
    return;
  }

  console.log("🧪 Testing localStorage persistence...");

  const testKey = "coopTest_" + Date.now();
  const testData = { test: true, timestamp: Date.now() };

  try {
    localStorage.setItem(testKey, JSON.stringify(testData));
    const retrieved = localStorage.getItem(testKey);
    const parsed = JSON.parse(retrieved || "{}");

    if (parsed.test === true) {
      console.log("✅ LocalStorage is working correctly");
    } else {
      console.log("❌ LocalStorage data corruption detected");
    }

    localStorage.removeItem(testKey);
  } catch (error) {
    console.error("❌ LocalStorage test failed:", error);
  }
}
