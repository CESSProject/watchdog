import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LeftDrawer } from "@/app/components/sidebar";
import NavBar from "@/app/components/navbar";
import Footer from "@/app/components/footer";
import React from "react";
import { PublicEnvScript } from "next-runtime-env";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Storage Monitor",
  description: "Monitor and manage CESS miners"
};

export default function RootLayout({
                                     children
                                   }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
    <head>
      <PublicEnvScript />
      <link rel="icon" href="/favicon.ico" type="image/x-icon" />
    </head>
    <body className={inter.className}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <NavBar />
      <LeftDrawer />
      <main className="pt-16 px-4 md:px-6">
        {children}
      </main>
      <Footer />
    </ThemeProvider>
    </body>
    </html>
  );
}