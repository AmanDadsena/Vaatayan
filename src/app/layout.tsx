import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import localFont from "next/font/local";
import { connection } from "next/server";
import { BRAND } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "700", "800"],
});

/* Designed by the Braille Institute for maximum legibility for low-vision readers. */
const body = Atkinson_Hyperlegible({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "700"],
});

/*
 * Tiro Devanagari Hindi, subset to the six letters of the वातायन wordmark:
 * about 3 KB instead of 62 KB for the full Devanagari set. SIL OFL (see fonts/OFL.txt).
 */
const devanagari = localFont({
  src: "./fonts/tiro-devanagari-wordmark.woff2",
  variable: "--font-devanagari",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: `${BRAND.name}: ${BRAND.tagline}`,
  description: BRAND.description,
  applicationName: BRAND.name,
};

export const viewport: Viewport = {
  themeColor: "#edf1f0",
  width: "device-width",
  initialScale: 1,
};

/**
 * Pages render per request so each one can carry the fresh CSP nonce from
 * src/proxy.ts; Next.js attaches it to every script it renders.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${devanagari.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
