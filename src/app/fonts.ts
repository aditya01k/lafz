import { Anton, Bebas_Neue, Geist, Geist_Mono, Inter, Montserrat, Poppins } from "next/font/google";

// Geist is the interface. The rest are caption faces, drawn on canvas only.
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });
export const montserrat = Montserrat({ subsets: ["latin"], weight: ["900"], variable: "--font-montserrat" });
export const anton = Anton({ subsets: ["latin"], weight: ["400"], variable: "--font-anton" });
export const poppins = Poppins({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-poppins" });
export const bebas = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--font-bebas" });

export const fontVariables = [geist, geistMono, inter, montserrat, anton, poppins, bebas].map((f) => f.variable).join(" ");
