// Quick test script to verify data persistence fixes
// Run this in the browser console

console.log("🧪 Testing Data Persistence Fixes");

// Test 1: Check localStorage functionality
function testLocalStorage() {
  console.log("\n1️⃣ Testing localStorage...");
  try {
    const testKey = 'coopTest_' + Date.now();
    const testData = { test: true, timestamp: Date.now() };
    
    localStorage.setItem(testKey, JSON.stringify(testData));
    const retrieved = localStorage.getItem(testKey);
    const parsed = JSON.parse(retrieved);
    
    if (parsed.test === true) {
      console.log("✅ LocalStorage is working");
    } else {
      console.log("❌ LocalStorage failed");
    }
    
    localStorage.removeItem(testKey);
  } catch (error) {
    console.error("❌ LocalStorage error:", error);
  }
}

// Test 2: Check existing coop data
function checkCoopData() {
  console.log("\n2️⃣ Checking existing coop data...");
  let coopKeys = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('coopState_')) {
      console.log(`📊 Found data for user: ${key.replace('coopState_', '')}`);
      coopKeys++;
    }
    if (key && key.startsWith('coopSeeded_')) {
      console.log(`🌱 Found seed flag for user: ${key.replace('coopSeeded_', '')}`);
    }
  }
  
  if (coopKeys === 0) {
    console.log("ℹ️ No coop data found in localStorage");
  }
}

// Test 3: Simulate auth state
function testAuthState() {
  console.log("\n3️⃣ Testing auth state handling...");
  
  // Check if auth context is available
  if (typeof window !== 'undefined' && window.location) {
    console.log(`📍 Current page: ${window.location.pathname}`);
    
    // Check for auth-related localStorage
    const authKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('supabase')) {
        authKeys.push(key);
      }
    }
    
    if (authKeys.length > 0) {
      console.log(`🔑 Found ${authKeys.length} auth-related keys`);
    } else {
      console.log("ℹ️ No auth data found");
    }
  }
}

// Run all tests
testLocalStorage();
checkCoopData();
testAuthState();

console.log("\n✅ Data persistence test completed. Check the logs above for any issues.");
