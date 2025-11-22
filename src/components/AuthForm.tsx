"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";

export default function AuthForm() {
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      } else if (mode === "signup") {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage("Check your email for confirmation link!");
          setMode("signin");
        }
      } else if (mode === "reset") {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage("Password reset email sent!");
          setMode("signin");
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto"></div>
          <p className="mt-2 text-sm font-light text-indigo-800">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-semibold text-indigo-900">
            {mode === "signin"
              ? "Sign in to your account"
              : mode === "signup"
              ? "Create your account"
              : "Reset your password"}
          </h2>
          <p className="mt-2 text-center text-sm sm:text-base font-light text-indigo-700">
            Coop Tracking System
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl border-2 border-indigo-200 shadow-lg" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-sm font-light placeholder-indigo-300 bg-white"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode !== "reset" && (
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  required
                  className="w-full px-4 py-3 border-2 border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 text-sm font-light placeholder-indigo-300 bg-white"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="text-rose-800 text-sm font-light text-center bg-rose-50 border-2 border-rose-200 p-3 rounded-lg">
              {error}
            </div>
          )}

          {message && (
            <div className="text-emerald-800 text-sm font-light text-center bg-emerald-50 border-2 border-emerald-200 p-3 rounded-lg">
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(
                "w-full flex justify-center px-5 py-2.5 border border-transparent text-sm font-normal rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 transition-all duration-200 min-h-[44px] shadow-md",
                isSubmitting
                  ? "bg-indigo-200 cursor-not-allowed text-indigo-600"
                  : "bg-indigo-300 text-indigo-900 hover:bg-indigo-400"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-900 mr-2"></div>
                  Loading...
                </div>
              ) : mode === "signin" ? (
                "Sign in"
              ) : mode === "signup" ? (
                "Sign up"
              ) : (
                "Send reset email"
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm font-light">
            {mode === "signin" ? (
              <>
                <button
                  type="button"
                  className="text-indigo-700 hover:text-indigo-900 transition-all duration-200 underline decoration-indigo-200 hover:decoration-indigo-400"
                  onClick={() => setMode("reset")}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="text-indigo-700 hover:text-indigo-900 transition-all duration-200 underline decoration-indigo-200 hover:decoration-indigo-400"
                  onClick={() => setMode("signup")}
                >
                  Create account
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-indigo-700 hover:text-indigo-900 transition-all duration-200 mx-auto underline decoration-indigo-200 hover:decoration-indigo-400"
                onClick={() => setMode("signin")}
              >
                Back to sign in
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
