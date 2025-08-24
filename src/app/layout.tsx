import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AuthenticatedCoopProvider from "@/components/AuthenticatedCoopProvider";
import AppNavigation from "@/components/AppNavigation";

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"]
});

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
      <body className={poppins.className}>
        <AuthProvider>
          <AuthenticatedCoopProvider>
            <AppNavigation />
            {children}
          </AuthenticatedCoopProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
