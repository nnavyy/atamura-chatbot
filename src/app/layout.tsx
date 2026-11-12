import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import { LanguageProvider } from "@/components/LanguageContext";

export const metadata: Metadata = {
  title: "Atamura Group | KERUEN Residences, Almaty",
  description: "Explore KERUEN apartments, floor plans and payment options in Tuzdybastau, Almaty. A considered residential community by Atamura Group.",
  keywords: "Atamura Group, KERUEN, apartment, Almaty, Kazakhstan, property, real estate, AI consultant",
  openGraph: {
    title: "Atamura Group | KERUEN Residences",
    description: "Explore KERUEN apartments, layouts and payment options near Almaty.",
    siteName: "Atamura Group",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="https://static.tildacdn.pro/tild3931-3731-4239-b762-633839313035/Group_12.png" />
      </head>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <LanguageProvider>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
          <ChatWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
