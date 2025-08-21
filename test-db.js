const { createClient } = require("@supabase/supabase-js");

// Load environment variables manually
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Environment variables:");
console.log("URL:", supabaseUrl ? "Set" : "Missing");
console.log("Key:", supabaseKey ? "Set" : "Missing");

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log("\n🔗 Testing Supabase connection...");

    // Test basic connection
    const { data, error } = await supabase
      .from("coop_state")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("❌ Connection failed:", error);
      return;
    }

    console.log("✅ Connection successful!");
    console.log("📊 Records in coop_state table:", data?.length || 0);

    // Test auth
    console.log("\n🔐 Testing auth...");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    console.log("Current user:", user ? user.email : "Not logged in");
  } catch (err) {
    console.error("❌ Test failed:", err);
  }
}

testConnection();
