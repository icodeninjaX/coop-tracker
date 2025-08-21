"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function AppNavigation() {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple clicks

    try {
      setIsSigningOut(true);
      console.log("Navigation: Initiating sign out");
      await signOut();
    } catch (error) {
      console.error("Navigation: Error during sign out:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <nav className="container mx-auto max-w-6xl px-4 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
            onClick={closeMobileMenu}
          >
            Coop Tracking
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/members"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                Members
              </Link>
              <Link
                href="/loans"
                className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                Loans
              </Link>
            </div>

            {user && (
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <span
                  className="text-sm text-gray-600 truncate max-w-[150px]"
                  title={user.email}
                >
                  {user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors px-3 py-1 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningOut ? "Signing Out..." : "Sign Out"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
            <div className="space-y-3 pt-4">
              <Link
                href="/"
                className="block text-base font-medium text-gray-700 hover:text-indigo-600 transition-colors py-2 px-2 rounded-md hover:bg-gray-50"
                onClick={closeMobileMenu}
              >
                Home
              </Link>
              <Link
                href="/members"
                className="block text-base font-medium text-gray-700 hover:text-indigo-600 transition-colors py-2 px-2 rounded-md hover:bg-gray-50"
                onClick={closeMobileMenu}
              >
                Members
              </Link>
              <Link
                href="/loans"
                className="block text-base font-medium text-gray-700 hover:text-indigo-600 transition-colors py-2 px-2 rounded-md hover:bg-gray-50"
                onClick={closeMobileMenu}
              >
                Loans
              </Link>

              {user && (
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <div className="text-sm text-gray-600 py-2 px-2 bg-gray-50 rounded-md">
                    <span className="font-medium">Logged in as:</span>
                    <br />
                    <span className="break-all">{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut();
                      closeMobileMenu();
                    }}
                    disabled={isSigningOut}
                    className="block w-full text-left text-base font-medium text-red-600 hover:text-red-700 transition-colors py-2 px-2 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSigningOut ? "Signing Out..." : "Sign Out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
