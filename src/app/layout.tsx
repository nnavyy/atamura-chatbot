import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/ChatWidget";
import { LanguageProvider } from "@/components/LanguageContext";

export const metadata: Metadata = {
  title: "Atamura Group — AI Property Consultant | KERUEN Residential Complex",
  description: "Find your perfect apartment in KERUEN residential complex with our AI-powered property consultant. ECO-comfort living in the foothills of Almaty, Kazakhstan.",
  keywords: "Atamura Group, KERUEN, apartment, Almaty, Kazakhstan, property, real estate, AI consultant",
  openGraph: {
    title: "Atamura Group — AI Property Consultant",
    description: "Find your perfect apartment in KERUEN residential complex with AI assistance.",
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
