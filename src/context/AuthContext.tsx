"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      console.error("Supabase not configured - check environment variables");
      setLoading(false);
      return;
    }

    console.log("AuthProvider: Initializing with Supabase");

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("AuthProvider: Initial session", session?.user?.id || "none");
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(
        "AuthProvider: Auth state changed",
        session?.user?.id || "none"
      );
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase)
      return { error: new Error("Supabase not configured") as AuthError };

    console.log("AuthProvider: Attempting sign in");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase)
      return { error: new Error("Supabase not configured") as AuthError };

    console.log("AuthProvider: Attempting sign up");
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();

    try {
      console.log("AuthProvider: Starting sign out process");

      // Don't clear state immediately - let components finish any pending saves

      if (supabase) {
        // Sign out from Supabase first
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("Error signing out from Supabase:", error);
        } else {
          console.log("Successfully signed out from Supabase");
        }
      } else {
        console.warn("Supabase not configured, clearing local state only");
      }

      // Give components time to finish saving before clearing state
      setTimeout(() => {
        console.log("AuthProvider: Clearing local state");

        // Clear local state
        setUser(null);
        setSession(null);

        // Clear any local storage data - use the correct key pattern
        if (typeof window !== "undefined") {
          // Clear user-specific coop state if we have a user ID
          if (user?.id) {
            localStorage.removeItem(`coopState_${user.id}`);
            localStorage.removeItem(`coopSeeded_${user.id}`);
          }
          localStorage.removeItem("supabase.auth.token");
        }

        // Force a reload to ensure clean state
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }, 500); // Give 500ms for any pending saves to complete
    } catch (error) {
      console.error("Error during sign out:", error);
      // Even if there's an error, clear local state and reload after delay
      setTimeout(() => {
        setUser(null);
        setSession(null);
        if (typeof window !== "undefined") {
          localStorage.clear();
          window.location.href = "/";
        }
      }, 500);
    }
  };

  const resetPassword = async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase)
      return { error: new Error("Supabase not configured") as AuthError };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
