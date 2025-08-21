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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {mode === "signin"
              ? "Sign in to your account"
              : mode === "signup"
              ? "Create your account"
              : "Reset your password"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Coop Tracking System
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
                  className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          {message && (
            <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md">
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={clsx(
                "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

          <div className="flex items-center justify-between text-sm">
            {mode === "signin" ? (
              <>
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-500"
                  onClick={() => setMode("reset")}
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-500"
                  onClick={() => setMode("signup")}
                >
                  Create account
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-indigo-600 hover:text-indigo-500 mx-auto"
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
