import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["opsz", "wdth"],
  display: "swap",
});
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mom, Don't Click — the agent that clicks the sketchy link so your mom never has to",
  description:
    "One email address your mom forwards anything sketchy to. An agent opens the link in a throwaway cloud browser, checks the evidence, and answers in one giant plain sentence.",
  icons: { icon: "/icon.svg" },
  metadataBase: new URL(process.env.PUBLIC_URL || "http://localhost:3000"),
  openGraph: {
    title: "Mom, Don't Click",
    description: "One email address your mom forwards anything sketchy to. We click it, so she never has to.",
    images: [{ url: "/og.png", width: 1280, height: 640 }],
    type: "website",
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: "#f6f0e4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
