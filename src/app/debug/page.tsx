"use client";

import { useAuth } from "@/context/AuthContext";
import { useCoop } from "@/context/CoopContext";

export default function DebugPage() {
  const { user, session } = useAuth();
  const { state } = useCoop();

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
