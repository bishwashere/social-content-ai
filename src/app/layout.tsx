import RootProvider from "@/providers/root-provider";
import "./globals.css";
import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import { Toaster } from "sonner";
import { GoogleAnalytics } from "@next/third-parties/google";
import NextAuthProvider from "@/providers/next-auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
const inter = Inter({ subsets: ["latin"] });
const roboto = Roboto({ subsets: ["latin"], weight: ["300", "400", "500", "700", "900"] })

export const metadata: Metadata = {
  title: "NextPostAI - Marketing Assistant for Apps & Products",
  description: "Generate engaging social media content with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${inter.className} ${roboto.className}`}>
        <ThemeProvider defaultTheme="system" storageKey="nextpostai-theme">
          <NextAuthProvider>
            <RootProvider>
              {children}
              <Toaster richColors />
            </RootProvider>
            <GoogleAnalytics
              gaId={"G-GLPQVZ5H11"}
            />
          </NextAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
