import type { Metadata } from "next";
import { Quicksand, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import InteractiveParticles from "@/components/ui/InteractiveParticles";
import RoamingBee from "@/components/ui/RoamingBee";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--font-quicksand" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["700", "800"], display: "swap", variable: "--font-heading" });

export const metadata: Metadata = {
  title: {
    default: "SinggleBee — Premium Online Store",
    template: "%s | SinggleBee",
  },
  description:
    "Shop premium quality products at SinggleBee. Fast delivery, secure payments, and exceptional customer service.",
  keywords: ["ecommerce", "online shopping", "singglebee", "premium products"],
  openGraph: {
    title: "SinggleBee — Premium Online Store",
    description:
      "Shop premium quality products at SinggleBee. Fast delivery, secure payments.",
    type: "website",
    locale: "en_IN",
    siteName: "SinggleBee",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://singglebee.com',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://singglebee.com'),
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${quicksand.variable} ${plusJakarta.variable}`}>
      <body className={`${quicksand.className} min-h-screen flex flex-col relative`}>
        <div className="fixed inset-0 honeycomb-pattern pointer-events-none -z-10" />
        <InteractiveParticles />
        <RoamingBee />
        <Providers>
          <GoogleAnalytics ga_id={process.env.NEXT_PUBLIC_GA_ID || ""} />
          <Navbar />
          <main className="flex-1 relative z-10">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
