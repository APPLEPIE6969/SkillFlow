import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// This is the import you asked for
import { Analytics } from "@vercel/analytics/next"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SkillFlow AI",
  description: "Your Personalized AI Tutor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}