import type { Metadata, Viewport } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";

const description =
  "Open-source captions for Indian languages that run offline on your Mac: Hindi, Tamil, Telugu and more, word by word, in English letters (kya scene hai) or their own script. Free on your Mac, or ₹4 a minute online.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://uselafz.in"),
  title: { default: "Lafz: Indian-language captions, offline on your Mac", template: "%s · Lafz" },
  description,
  applicationName: "Lafz",
  keywords: [
    "Hinglish captions", "Hindi subtitles", "Indian language captions", "reel captions", "auto captions",
    "Tamil captions", "Telugu captions", "open source captions", "Kalakar alternative", "SRT generator",
    "offline captions Mac", "Whisper Mac captions", "local captions Apple Silicon",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Lafz",
    url: "/",
    title: "Lafz: Indian-language captions, offline on your Mac",
    description,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "Lafz: Indian-language captions, offline on your Mac", description },
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
