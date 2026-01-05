import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Present ko sir! - QR Code Attendance System",
  description: "Modern QR code attendance system for instructors. Track student attendance with ease using QR code scanning technology.",
  keywords: ["attendance", "QR code", "education", "tracking", "students", "instructors", "Present ko sir"],
  authors: [{ name: "Present ko sir! Team" }],
  icons: {
    icon: "/ICAS Logo Blue TRBG White Logo BG v2.png",
  },
  openGraph: {
    title: "Present ko sir! - QR Code Attendance System",
    description: "Track student attendance with QR code scanning technology",
    url: "http://localhost:3000",
    siteName: "Present ko sir!",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Present ko sir! - QR Code Attendance System",
    description: "Track student attendance with QR code scanning technology",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
