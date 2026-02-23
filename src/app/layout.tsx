import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gamorax.app"),
  title: {
    default: "GamoRax",
    template: "%s • GamoRax",
  },
  description: "Create and join interactive quiz sessions — minimal, fast, classroom-friendly.",
  openGraph: {
    title: "GamoRax",
    description: "Gamified quiz sessions for classrooms.",
    url: "https://gamorax.app",
    siteName: "GamoRax",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
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
        {children}
      </body>
    </html>
  );
}
