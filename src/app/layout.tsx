import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CoopProvider } from "@/context/CoopContext";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coop Tracking System",
  description: "Track cooperative payments, loans, and balances",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CoopProvider>
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
              </div>
            </nav>
          </header>
          {children}
        </CoopProvider>
      </body>
    </html>
  );
}
