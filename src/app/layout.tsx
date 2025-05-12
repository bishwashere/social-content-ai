import RootProvider from "@/providers/root-provider";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import NextAuthProvider from "@/providers/next-auth-provider";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextPostAI - AI-powered Social Media Content Generator",
  description: "Generate engaging social media content with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>
          <RootProvider>
            {children}
            <Toaster richColors />
          </RootProvider>
          <GoogleAnalytics
            gaId={"G-GLPQVZ5H11"}
          />
        </NextAuthProvider>
      </body>
    </html>
  );
}
