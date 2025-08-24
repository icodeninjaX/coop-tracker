"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function AppNavigation() {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pathname = usePathname();

  const handleSignOut = async () => {
    if (isSigningOut) return;

    try {
      setIsSigningOut(true);
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

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    { href: "/members", label: "Members", icon: "👥" },
    { href: "/loans", label: "Loans", icon: "💰" },
  ];

  return (
    <>
      {/* Modern app-like header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <nav className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
              onClick={closeMobileMenu}
            >
              <span className="text-2xl">🏦</span>
              <span>CoopTracker</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {user && (
                <>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user.email?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {user.email}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                  >
                    <span>🚪</span>
                    <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200"
              aria-label="Toggle menu"
            >
              <svg
                className={`h-6 w-6 transition-transform duration-200 ${
                  isMobileMenuOpen ? "rotate-90" : ""
                }`}
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
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          isMobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
        <div
          className={`absolute top-16 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200/50 transition-all duration-300 ${
            isMobileMenuOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-4 scale-95"
          }`}
        >
          <div className="p-6">
            {/* Mobile Navigation */}
            <nav className="space-y-2 mb-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Mobile User Section */}
            {user && (
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Account</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    closeMobileMenu();
                    handleSignOut();
                  }}
                  disabled={isSigningOut}
                  className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>🚪</span>
                  <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
