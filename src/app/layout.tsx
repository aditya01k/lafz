import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";

const description =
  "Open-source, word-by-word captions for reels in 11 Indian languages: Hindi, Tamil, Telugu and more, in English letters (kya scene hai) or their own script. Free to run yourself, or ₹10 a minute hosted.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://uselafz.in"),
  title: { default: "Lafz: captions for every Indian language", template: "%s · Lafz" },
  description,
  applicationName: "Lafz",
  keywords: [
    "Hinglish captions", "Hindi subtitles", "Indian language captions", "reel captions", "auto captions",
    "Tamil captions", "Telugu captions", "open source captions", "Kalakar alternative", "SRT generator",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Lafz",
    url: "/",
    title: "Lafz: captions for every Indian language",
    description,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "Lafz: captions for every Indian language", description },
  icons: { icon: "/icon.svg", apple: "/apple-icon" },
};

export const viewport: Viewport = {
  themeColor: "#ece6dc",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
