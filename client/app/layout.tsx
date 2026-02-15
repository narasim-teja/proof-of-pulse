import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NearWalletProvider } from "@/components/wallet-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proof of Pulse",
  description:
    "Biometric attestation oracle on NEAR Protocol — prove your workout is real",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NearWalletProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            toastOptions={{
              duration: 4000,
              className: "font-mono text-sm",
            }}
          />
        </NearWalletProvider>
      </body>
    </html>
  );
}
