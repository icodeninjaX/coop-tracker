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
    { href: "/", label: "Dashboard" },
    { href: "/members", label: "Members" },
    { href: "/loans", label: "Loans" },
  ];

  return (
    <>
      {/* Minimalist header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <nav className="container mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="text-lg font-light text-neutral-900 tracking-tight hover:text-neutral-700 transition-colors duration-200"
              onClick={closeMobileMenu}
            >
              CoopTracker
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md text-sm font-normal transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center gap-4">
              {user && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-900 rounded-full flex items-center justify-center">
                      <span className="text-white font-normal text-xs">
                        {user.email?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="text-sm font-light text-neutral-700">
                      {user.email}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md text-sm font-normal hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200 disabled:opacity-50"
                  >
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-all duration-200"
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
          className="absolute inset-0 bg-black/20"
          onClick={closeMobileMenu}
        />
        <div
          className={`absolute top-16 left-4 right-4 bg-white rounded-lg shadow-lg border border-neutral-200 transition-all duration-300 ${
            isMobileMenuOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 -translate-y-4 scale-95"
          }`}
        >
          <div className="p-4">
            {/* Mobile Navigation */}
            <nav className="space-y-1 mb-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`flex items-center px-4 py-2.5 rounded-md text-sm font-normal transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Mobile User Section */}
            {user && (
              <div className="pt-4 border-t border-neutral-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-neutral-900 rounded-full flex items-center justify-center">
                    <span className="text-white font-normal text-sm">
                      {user.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-normal text-neutral-900">Account</p>
                    <p className="text-xs font-light text-neutral-500">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    closeMobileMenu();
                    handleSignOut();
                  }}
                  disabled={isSigningOut}
                  className="w-full px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-md text-sm font-normal hover:border-neutral-400 hover:bg-neutral-50 transition-all duration-200 disabled:opacity-50"
                >
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
