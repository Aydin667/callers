import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Silkscreen, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SITE_TAGLINE, SITE_URL } from "@/lib/config";

const silkscreen = Silkscreen({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-silkscreen",
});
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Callers — the people who called it get paid",
    template: "%s — Callers",
  },
  description:
    "Open a call window before your coin exists. Whoever calls it first is written into the coin’s on-chain Pump.fun fee split and gets paid on every trade.",
  openGraph: {
    title: "Callers — the people who called it get paid",
    description:
      "Call a coin before it launches and earn a share of its creator fees, paid on-chain by Pump.fun.",
    url: SITE_URL,
    siteName: "Callers",
    images: [{ url: "/branding/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Callers — the people who called it get paid",
    description: SITE_TAGLINE,
    images: ["/branding/og.png"],
  },
  alternates: { canonical: SITE_URL },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${silkscreen.variable} ${grotesk.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
