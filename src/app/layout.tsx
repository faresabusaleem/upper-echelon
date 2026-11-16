import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getViewer } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { ClientRuntime } from "@/components/layout/client-runtime";
import { CookieNotice } from "@/components/layout/cookie-notice";
import "katex/dist/katex.min.css";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const sans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  variable: "--font-instrument",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const description =
  "A quiet society for sharp minds. Measure yourself in eight cognitive trials, find the tests that matter, and argue with people who think for a living.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Upper Echelon · A society for sharp minds", template: "%s · Upper Echelon" },
  description,
  applicationName: "Upper Echelon",
  openGraph: {
    type: "website",
    siteName: "Upper Echelon",
    title: "Upper Echelon",
    description,
    url: siteUrl,
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title: "Upper Echelon", description },
  icons: {
    icon: [
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const s = viewer?.settings;
  return (
    <html
      lang="en-GB"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${s?.grain === false ? "" : "grain"}`}
      data-motion={s?.reduced_motion ? "reduced" : undefined}
      data-contrast={s?.high_contrast ? "high" : undefined}
      suppressHydrationWarning
    >
      <body className="flex min-h-svh flex-col">
        {children}
        <ClientRuntime />
        <CookieNotice />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
