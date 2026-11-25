import {
  Alex_Brush, Allura, Anton, Baloo_2, Baloo_Bhai_2, Baloo_Bhaina_2, Baloo_Chettan_2, Baloo_Da_2, Baloo_Paaji_2,
  Baloo_Tamma_2, Baloo_Tammudu_2, Baloo_Thambi_2, Bebas_Neue, Bodoni_Moda, Bricolage_Grotesque, Caveat,
  Cormorant_Garamond, DM_Serif_Display, Fraunces, Geist, Geist_Mono, Gloock, Great_Vibes, Instrument_Serif,
  Inter_Tight, Luckiest_Guy, Montserrat, Noto_Nastaliq_Urdu, Oswald, Permanent_Marker, Pinyon_Script,
  Playfair_Display, Plus_Jakarta_Sans, Poppins, Schibsted_Grotesk, Space_Grotesk, Tinos, Unbounded,
} from "next/font/google";
import { FONT_FAMILIES } from "@/lib/fonts";

// The interface.
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
// The landing page's editorial accent.
export const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" });

// Caption faces, drawn on canvas. Not preloaded: each loads the first time a caption uses it.
// next/font needs every loader called on its own top-level const, with literal options.
const f_anton = Anton({ subsets: ["latin"], weight: "400", preload: false });
const f_instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], preload: false });
const f_greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", preload: false });
const f_playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const f_fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const f_cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], style: ["normal", "italic"], preload: false });
const f_bodoni = Bodoni_Moda({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const f_gloock = Gloock({ subsets: ["latin"], weight: "400", preload: false });
const f_dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], preload: false });
const f_allura = Allura({ subsets: ["latin"], weight: "400", preload: false });
const f_alexBrush = Alex_Brush({ subsets: ["latin"], weight: "400", preload: false });
const f_pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", preload: false });
const f_caveat = Caveat({ subsets: ["latin"], preload: false });
const f_permanentMarker = Permanent_Marker({ subsets: ["latin"], weight: "400", preload: false });
const f_interTight = Inter_Tight({ subsets: ["latin"], preload: false });
const f_schibsted = Schibsted_Grotesk({ subsets: ["latin"], style: ["normal", "italic"], preload: false });
const f_montserrat = Montserrat({ subsets: ["latin"], preload: false });
const f_bricolage = Bricolage_Grotesque({ subsets: ["latin"], preload: false });
const f_jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], preload: false });
const f_poppins = Poppins({ subsets: ["latin"], weight: ["600", "700", "800", "900"], preload: false });
const f_geist = Geist({ subsets: ["latin"], preload: false });
const f_spaceGrotesk = Space_Grotesk({ subsets: ["latin"], preload: false });
const f_bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", preload: false });
const f_oswald = Oswald({ subsets: ["latin"], preload: false });
const f_unbounded = Unbounded({ subsets: ["latin"], preload: false });
const f_luckiest = Luckiest_Guy({ subsets: ["latin"], weight: "400", preload: false });
// Fallbacks for the system fonts: Tinos has Times New Roman's exact metrics; Inter Tight stands in for SF Pro.
const f_tinos = Tinos({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], preload: false });

// One face per Indian script, used automatically for words in that script.
const s_devanagari = Baloo_2({ subsets: ["devanagari"], preload: false });
const s_tamil = Baloo_Thambi_2({ subsets: ["tamil"], preload: false });
const s_telugu = Baloo_Tammudu_2({ subsets: ["telugu"], preload: false });
const s_kannada = Baloo_Tamma_2({ subsets: ["kannada"], preload: false });
const s_malayalam = Baloo_Chettan_2({ subsets: ["malayalam"], preload: false });
const s_bengali = Baloo_Da_2({ subsets: ["bengali"], preload: false });
const s_gujarati = Baloo_Bhai_2({ subsets: ["gujarati"], preload: false });
const s_gurmukhi = Baloo_Paaji_2({ subsets: ["gurmukhi"], preload: false });
const s_odia = Baloo_Bhaina_2({ subsets: ["oriya"], preload: false });
const s_urdu = Noto_Nastaliq_Urdu({ subsets: ["arabic"], preload: false });

const bundled: Record<string, { style: { fontFamily: string } }> = {
  anton: f_anton, instrumentSerif: f_instrumentSerif, greatVibes: f_greatVibes, playfair: f_playfair,
  fraunces: f_fraunces, cormorant: f_cormorant, bodoni: f_bodoni, gloock: f_gloock, dmSerif: f_dmSerif,
  allura: f_allura, alexBrush: f_alexBrush, pinyon: f_pinyon, caveat: f_caveat, permanentMarker: f_permanentMarker,
  interTight: f_interTight, schibsted: f_schibsted, montserrat: f_montserrat, bricolage: f_bricolage,
  jakarta: f_jakarta, poppins: f_poppins, geist: f_geist, spaceGrotesk: f_spaceGrotesk, bebas: f_bebas,
  oswald: f_oswald, unbounded: f_unbounded, luckiest: f_luckiest,
  devanagari: s_devanagari, tamil: s_tamil, telugu: s_telugu, kannada: s_kannada, malayalam: s_malayalam,
  bengali: s_bengali, gujarati: s_gujarati, gurmukhi: s_gurmukhi, odia: s_odia, urdu: s_urdu,
};

/** Points the renderer at the family names next/font generated. Runs once on import. */
for (const [id, f] of Object.entries(bundled)) FONT_FAMILIES[id] = f.style.fontFamily;
FONT_FAMILIES.sfpro = `"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, ${f_interTight.style.fontFamily}`;
FONT_FAMILIES.timesNewRoman = `"Times New Roman", Times, ${f_tinos.style.fontFamily}`;
// Paid fonts: the creator's installed copy if they have one, else the closest free face.
FONT_FAMILIES.editorsNote = `"Editor's Note", "Editors Note", ${f_instrumentSerif.style.fontFamily}`;
FONT_FAMILIES.astonScript = `"Aston Script", ${f_greatVibes.style.fontFamily}`;

export const fontVariables = [geist, geistMono, serif].map((f) => f.variable).join(" ");
