"use client";

import { useAuth } from "@/context/AuthContext";
import { CoopProvider } from "@/context/CoopContext";
import { ReactNode } from "react";

interface AuthenticatedCoopProviderProps {
  children: ReactNode;
}

export default function AuthenticatedCoopProvider({
  children,
}: AuthenticatedCoopProviderProps) {
  const { user, loading } = useAuth();

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only render CoopProvider when we have a user
  if (!user) {
    return <>{children}</>;
  }

  return <CoopProvider>{children}</CoopProvider>;
}
