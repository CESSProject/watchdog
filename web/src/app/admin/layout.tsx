import type { Metadata } from "next";
import "../globals.css";
import { LeftDrawer } from "@/app/admin/components/sidebar";
import NavBar from "@/app/admin/components/navbar";
import Footer from "@/app/admin/components/footer";
import React from "react";
import { ThemeProvider } from "next-themes";


export const metadata: Metadata = {
  title: "Watchdog",
  description: "CESS Watchdog"
};

export default function RootLayout({
                                     children
                                   }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="">
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
    </div>

  )
    ;
}
