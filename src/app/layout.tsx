import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { GarageProvider } from "@/lib/garage-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shinno Performance",
  description: "Control Shinno RGB emblem, mirror, bumper, and grille lights.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <GarageProvider>{children}</GarageProvider>
      </body>
    </html>
  );
}
