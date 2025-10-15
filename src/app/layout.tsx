import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'
import { Providers } from "@/components/provider";
import { UserProvider } from "@/contexts/userContext";
import { ProtectedRoutes } from "@/components/protectedRoutes";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Electrochem Admin",
  description: "Admin panel for Electrochem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <UserProvider>
            <ProtectedRoutes>
        {children}
            </ProtectedRoutes>
        </UserProvider>
        </Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
