/**
 * Caption fonts: current Google Fonts creators use, grouped for the picker. Each Indian
 * script gets a matching face (the Baloo family, Nastaliq for Urdu) that the renderer
 * falls back to automatically, so a Latin display font still draws Tamil or Hindi well.
 *
 * `FONT_FAMILIES` holds the CSS family names next/font generated; src/app/fonts.ts
 * fills it in at startup.
 */
export type FontId =
  | "montserrat" | "anton" | "bebas" | "poppins" | "inter" | "geist"
  | "bricolage" | "jakarta" | "unbounded" | "syne" | "sora" | "outfit" | "spaceGrotesk" | "archivoBlack"
  | "oswald" | "luckiest" | "bangers" | "lilita" | "titan" | "rubik"
  | "instrumentSerif" | "dmSerif" | "permanentMarker" | "caveat";

export type ScriptFontId =
  | "devanagari" | "tamil" | "telugu" | "kannada" | "malayalam"
  | "bengali" | "gujarati" | "gurmukhi" | "odia" | "urdu";

export type FontMeta = { id: FontId; name: string; group: string; weights: number[]; italic?: boolean };

export const FONTS: FontMeta[] = [
  { id: "montserrat", name: "Montserrat", group: "Bold sans", weights: [700, 800, 900] },
  { id: "bricolage", name: "Bricolage Grotesque", group: "Bold sans", weights: [600, 700, 800] },
  { id: "jakarta", name: "Plus Jakarta Sans", group: "Bold sans", weights: [600, 700, 800] },
  { id: "poppins", name: "Poppins", group: "Bold sans", weights: [600, 700, 800, 900] },
  { id: "outfit", name: "Outfit", group: "Bold sans", weights: [600, 700, 800, 900] },
  { id: "sora", name: "Sora", group: "Bold sans", weights: [600, 700, 800] },
  { id: "rubik", name: "Rubik", group: "Bold sans", weights: [600, 700, 800, 900] },
  { id: "archivoBlack", name: "Archivo Black", group: "Bold sans", weights: [400] },
  { id: "inter", name: "Inter", group: "Clean", weights: [500, 600, 700, 800] },
  { id: "geist", name: "Geist", group: "Clean", weights: [500, 600, 700, 800] },
  { id: "spaceGrotesk", name: "Space Grotesk", group: "Clean", weights: [500, 600, 700] },
  { id: "anton", name: "Anton", group: "Condensed", weights: [400] },
  { id: "bebas", name: "Bebas Neue", group: "Condensed", weights: [400] },
  { id: "oswald", name: "Big Shoulders Display", group: "Condensed", weights: [700, 800, 900] },
  { id: "unbounded", name: "Unbounded", group: "Wide", weights: [600, 700, 800, 900] },
  { id: "syne", name: "Syne", group: "Wide", weights: [600, 700, 800] },
  { id: "luckiest", name: "Luckiest Guy", group: "Fun", weights: [400] },
  { id: "bangers", name: "Bangers", group: "Fun", weights: [400] },
  { id: "lilita", name: "Lilita One", group: "Fun", weights: [400] },
  { id: "titan", name: "Titan One", group: "Fun", weights: [400] },
  { id: "instrumentSerif", name: "Instrument Serif", group: "Serif & hand", weights: [400], italic: true },
  { id: "dmSerif", name: "DM Serif Display", group: "Serif & hand", weights: [400], italic: true },
  { id: "permanentMarker", name: "Permanent Marker", group: "Serif & hand", weights: [400] },
  { id: "caveat", name: "Caveat", group: "Serif & hand", weights: [600, 700] },
];

export const fontMeta = (id: FontId) => FONTS.find((f) => f.id === id) ?? FONTS[0];

export const FONT_FAMILIES: Record<FontId | ScriptFontId, string> = Object.fromEntries(
  [...FONTS.map((f) => [f.id, `'${f.name}', sans-serif`]), ...(["devanagari", "tamil", "telugu", "kannada", "malayalam", "bengali", "gujarati", "gurmukhi", "odia", "urdu"] as const).map((s) => [s, "sans-serif"])],
) as Record<FontId | ScriptFontId, string>;

// Unicode blocks → the script font that draws them.
const SCRIPT_RANGES: [RegExp, ScriptFontId][] = [
  [/[ऀ-ॿ]/, "devanagari"],
  [/[ঀ-৿]/, "bengali"],
  [/[਀-੿]/, "gurmukhi"],
  [/[઀-૿]/, "gujarati"],
  [/[଀-୿]/, "odia"],
  [/[஀-௿]/, "tamil"],
  [/[ఀ-౿]/, "telugu"],
  [/[ಀ-೿]/, "kannada"],
  [/[ഀ-ൿ]/, "malayalam"],
  [/[؀-ۿݐ-ݿ]/, "urdu"],
];

export function scriptsIn(text: string): ScriptFontId[] {
  return SCRIPT_RANGES.filter(([re]) => re.test(text)).map(([, s]) => s);
}

export const isRtl = (text: string) => /[؀-ۿݐ-ݿ]/.test(text);

/** CSS font-family list: the chosen face first, then the script faces this text needs. */
export function fontStack(font: FontId, text: string): string {
  return [FONT_FAMILIES[font], ...scriptsIn(text).map((s) => FONT_FAMILIES[s])].join(", ");
}

const loaded = new Map<string, Promise<unknown>>();

/** Loads the faces needed to draw `text` in this font, once. Canvas can't wait for CSS on its own. */
export function ensureFont(font: FontId, weight: number, text: string, italic = false): Promise<unknown> {
  if (typeof document === "undefined") return Promise.resolve();
  const scripts = scriptsIn(text);
  const key = `${font}:${weight}:${italic}:${scripts.join(",")}`;
  let p = loaded.get(key);
  if (!p) {
    const style = italic ? "italic " : "";
    p = Promise.all([
      document.fonts.load(`${style}${weight} 40px ${FONT_FAMILIES[font]}`, "Aa"),
      ...scripts.map((s) => document.fonts.load(`${Math.min(800, Math.max(400, weight))} 40px ${FONT_FAMILIES[s]}`, text)),
    ]).catch(() => []);
    loaded.set(key, p);
  }
  return p;
}
