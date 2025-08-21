"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function AppNavigation() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="border-b bg-white">
      <nav className="container mx-auto max-w-6xl p-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-gray-900">
          Coop Tracking
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-gray-700 hover:text-indigo-600"
          >
            Home
          </Link>
          <Link
            href="/members"
            className="text-sm text-gray-700 hover:text-indigo-600"
          >
            Members
          </Link>
          <Link
            href="/loans"
            className="text-sm text-gray-700 hover:text-indigo-600"
          >
            Loans
          </Link>

          {user && (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
