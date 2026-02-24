import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800", "900"],
});

export const metadata: Metadata = {
  title: "TransitTrack — Real-time Bus Tracking",
  description:
    "Live GPS bus tracking, AI-powered arrival predictions, and smart route optimization for small cities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("antialiased", poppins.className)}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
