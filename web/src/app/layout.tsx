import {Inter} from "next/font/google";
import "./globals.css";
import {PublicEnvScript} from "next-runtime-env";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({subsets: ["latin"]});

export default function RootLayout({children,}: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
    <head>
      <PublicEnvScript/>
      <title>CESS Operation Platform</title>
    </head>
    <body className={inter.className}>
    {children}
    <Toaster position="top-center" duration={3000}/>
    </body>
    </html>
  );
}