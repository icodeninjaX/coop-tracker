"use client";

import { useAuth } from "@/context/AuthContext";
import { useCoop } from "@/context/CoopContext";
import { debugDataPersistence, clearAllCoopData, testDataPersistence } from "@/lib/debugUtils";

export default function DebugPage() {
  const { user, session, signOut } = useAuth();
  const { state } = useCoop();

  const handleTestSignOut = async () => {
    console.log("Debug: Testing sign out...");
    try {
      await signOut();
      console.log("Debug: Sign out completed");
    } catch (error) {
      console.error("Debug: Sign out failed:", error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>

      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
          <div className="text-sm">
            <p>
              <strong>User ID:</strong> {user?.id || "Not logged in"}
            </p>
            <p>
              <strong>Email:</strong> {user?.email || "N/A"}
            </p>
            <p>
              <strong>Session:</strong> {session ? "Active" : "None"}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Coop State Summary</h2>
          <div className="text-sm">
            <p>
              <strong>Members:</strong> {state.members.length}
            </p>
            <p>
              <strong>Collections:</strong> {state.collections.length}
            </p>
            <p>
              <strong>Loans:</strong> {state.loans.length}
            </p>
            <p>
              <strong>Current Balance:</strong> ₱
              {state.currentBalance.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Environment Check</h2>
          <div className="text-sm">
            <p>
              <strong>Supabase URL:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "Set" : "Missing"}
            </p>
            <p>
              <strong>Supabase Key:</strong>{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Missing"}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Data Persistence Debug</h2>
          <div className="space-y-2">
            <button
              onClick={debugDataPersistence}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors mr-2"
            >
              Debug LocalStorage
            </button>
            <button
              onClick={testDataPersistence}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors mr-2"
            >
              Test Persistence
            </button>
            <button
              onClick={clearAllCoopData}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              Clear All Data
            </button>
            <p className="text-sm text-gray-600 mt-2">
              Use these buttons to debug data persistence issues. Check browser console for detailed logs.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Authentication Actions</h2>
          <div className="space-y-2">
            {user && (
              <button
                onClick={handleTestSignOut}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Test Sign Out
              </button>
            )}
            <p className="text-sm text-gray-600">
              Use this button to test the sign out functionality and check
              console logs.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Recent Members</h2>
          <div className="text-sm max-h-40 overflow-y-auto">
            {state.members.slice(0, 5).map((member, index) => (
              <p key={index}>
                <strong>{member.name}</strong> (ID: {member.id})
              </p>
            ))}
            {state.members.length === 0 && <p>No members found</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
