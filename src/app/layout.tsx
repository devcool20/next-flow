import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import RouteLoadingBar from "@/components/layout/RouteLoadingBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextFlow - LLM Workflows",
  description: "A professional workflow builder for LLMs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-zinc-950 text-slate-50 antialiased overflow-hidden`}>
          <Suspense fallback={null}>
            <RouteLoadingBar />
          </Suspense>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
