import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./live.css";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/site";
import ErrorReporter from "@/components/ErrorReporter";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "king of the hill",
  description: "One KOTH token powers hourly squad and supporter rewards with a 40/40/20 fee split.",
  openGraph: {
    title: "king of the hill",
    description: "Back a squad with KOTH. 40% squad rewards, 40% supporter rewards, 20% KOTH buy-and-burn.",
    images: ["/king/opengraph-image"],
  },
  twitter: { card: "summary_large_image", images: ["/king/opengraph-image"] },
};

export const viewport: Viewport = { themeColor: "#08090b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The intro plays once per browser session; this hides it before first paint after that. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{if(sessionStorage.getItem("pt:booted")==="1")document.documentElement.dataset.booted="1"}catch(e){}' }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="fx-scan" aria-hidden />
        <div className="fx-vignette" aria-hidden />
        {children}
        <ErrorReporter />
        <Analytics />
      </body>
    </html>
  );
}
