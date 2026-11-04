import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { GarageProvider } from "@/lib/garage-context";
import { ThemeRoot } from "@/lib/theme-root";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shinno Lights",
  description: "Control Shinno RGB emblem, mirror, and bumper lights from Shin No Performance LLC.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050505",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-background font-sans text-foreground">
        <GarageProvider>
          <ThemeRoot>{children}</ThemeRoot>
        </GarageProvider>
      </body>
    </html>
  );
}
