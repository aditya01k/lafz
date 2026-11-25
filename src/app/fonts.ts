import {
  Anton, Archivo_Black, Baloo_2, Baloo_Bhai_2, Baloo_Bhaina_2, Baloo_Chettan_2, Baloo_Da_2, Baloo_Paaji_2,
  Baloo_Tamma_2, Baloo_Tammudu_2, Baloo_Thambi_2, Bangers, Bebas_Neue, Bricolage_Grotesque, Caveat, DM_Serif_Display,
  Geist, Geist_Mono, Instrument_Serif, Inter, Lilita_One, Luckiest_Guy, Montserrat, Noto_Nastaliq_Urdu, Oswald,
  Outfit, Permanent_Marker, Plus_Jakarta_Sans, Poppins, Rubik, Sora, Space_Grotesk, Syne, Titan_One, Unbounded,
} from "next/font/google";
import { FONT_FAMILIES, type FontId, type ScriptFontId } from "@/lib/fonts";

// The interface.
export const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
export const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

// Caption faces, drawn on canvas. Not preloaded: each loads the first time a caption uses it.
// next/font needs every loader called on its own top-level const, with literal options.
const f_montserrat = Montserrat({ subsets: ["latin"], preload: false });
const f_bricolage = Bricolage_Grotesque({ subsets: ["latin"], preload: false });
const f_jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], preload: false });
const f_poppins = Poppins({ subsets: ["latin"], weight: ["600", "700", "800", "900"], preload: false });
const f_outfit = Outfit({ subsets: ["latin"], preload: false });
const f_sora = Sora({ subsets: ["latin"], preload: false });
const f_rubik = Rubik({ subsets: ["latin"], preload: false });
const f_archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", preload: false });
const f_inter = Inter({ subsets: ["latin"], preload: false });
const f_geist = Geist({ subsets: ["latin"], preload: false });
const f_spaceGrotesk = Space_Grotesk({ subsets: ["latin"], preload: false });
const f_anton = Anton({ subsets: ["latin"], weight: "400", preload: false });
const f_bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", preload: false });
const f_oswald = Oswald({ subsets: ["latin"], preload: false });
const f_unbounded = Unbounded({ subsets: ["latin"], preload: false });
const f_syne = Syne({ subsets: ["latin"], preload: false });
const f_luckiest = Luckiest_Guy({ subsets: ["latin"], weight: "400", preload: false });
const f_bangers = Bangers({ subsets: ["latin"], weight: "400", preload: false });
const f_lilita = Lilita_One({ subsets: ["latin"], weight: "400", preload: false });
const f_titan = Titan_One({ subsets: ["latin"], weight: "400", preload: false });
const f_instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], preload: false });
const f_dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], preload: false });
const f_permanentMarker = Permanent_Marker({ subsets: ["latin"], weight: "400", preload: false });
const f_caveat = Caveat({ subsets: ["latin"], preload: false });
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

const caption: Record<FontId, { style: { fontFamily: string } }> = {
  montserrat: f_montserrat,
  bricolage: f_bricolage,
  jakarta: f_jakarta,
  poppins: f_poppins,
  outfit: f_outfit,
  sora: f_sora,
  rubik: f_rubik,
  archivoBlack: f_archivoBlack,
  inter: f_inter,
  geist: f_geist,
  spaceGrotesk: f_spaceGrotesk,
  anton: f_anton,
  bebas: f_bebas,
  oswald: f_oswald,
  unbounded: f_unbounded,
  syne: f_syne,
  luckiest: f_luckiest,
  bangers: f_bangers,
  lilita: f_lilita,
  titan: f_titan,
  instrumentSerif: f_instrumentSerif,
  dmSerif: f_dmSerif,
  permanentMarker: f_permanentMarker,
  caveat: f_caveat,
};

// One face per Indian script, used automatically for words in that script.
const scripts: Record<ScriptFontId, { style: { fontFamily: string } }> = {
  devanagari: s_devanagari,
  tamil: s_tamil,
  telugu: s_telugu,
  kannada: s_kannada,
  malayalam: s_malayalam,
  bengali: s_bengali,
  gujarati: s_gujarati,
  gurmukhi: s_gurmukhi,
  odia: s_odia,
  urdu: s_urdu,
};

/** Points the renderer at the family names next/font generated. Runs once on import. */
for (const [id, f] of Object.entries({ ...caption, ...scripts })) FONT_FAMILIES[id as FontId] = f.style.fontFamily;

export const captionFamily = (id: FontId) => caption[id].style.fontFamily;

export const fontVariables = [geist, geistMono].map((f) => f.variable).join(" ");
