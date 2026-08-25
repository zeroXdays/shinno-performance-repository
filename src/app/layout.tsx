import type { Metadata } from "next";
import { Geist, Oswald } from "next/font/google";
import { GarageProvider } from "@/lib/garage-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const display = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Shinno Lights",
  description:
    "Apple-first controller for Shinno Performance Q50 RGB emblem, mirrors, bumper, and grille lights. Built for ELK-BLEDOM boxes — without Lotus Lantern clutter.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <GarageProvider>{children}</GarageProvider>
      </body>
    </html>
  );
}
