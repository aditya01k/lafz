/**
 * Caption fonts. Three kinds:
 *   google: bundled through next/font (src/app/fonts.ts fills in their family names)
 *   system: SF Pro and Times New Roman, which can't be bundled; used where the device has them,
 *           with a close free face as the fallback (Tinos is Times New Roman's metric twin)
 *   custom: fonts a creator uploads (e.g. Editor's Note, Aston Script), kept in their browser
 * Each Indian script also gets a matching face (the Baloo family, Nastaliq for Urdu) that the
 * renderer falls back to automatically.
 */
export type FontId = string;

export type ScriptFontId =
  | "devanagari" | "tamil" | "telugu" | "kannada" | "malayalam"
  | "bengali" | "gujarati" | "gurmukhi" | "odia" | "urdu";

export type FontMeta = { id: FontId; name: string; group: string; weights: number[]; italic?: boolean; kind?: "system" | "custom" | "licensed" };

export const FONTS: FontMeta[] = [
  // The creator's own picks first.
  // The creator's own five. Editor's Note and Aston Script are paid fonts we can't ship: they use
  // the creator's installed or uploaded copy, and a close free face until then.
  { id: "sfpro", name: "SF Pro", group: "Favourites", weights: [500, 600, 700, 800, 900], italic: true, kind: "system" },
  { id: "editorsNote", name: "Editor's Note", group: "Favourites", weights: [400], italic: true, kind: "licensed" },
  { id: "anton", name: "Anton", group: "Favourites", weights: [400] },
  { id: "astonScript", name: "Aston Script", group: "Favourites", weights: [400], kind: "licensed" },
  { id: "timesNewRoman", name: "Times New Roman", group: "Favourites", weights: [400, 700], italic: true, kind: "system" },

  { id: "instrumentSerif", name: "Instrument Serif", group: "Serif", weights: [400], italic: true },
  { id: "greatVibes", name: "Great Vibes", group: "Script", weights: [400] },

  { id: "playfair", name: "Playfair Display", group: "Serif", weights: [500, 600, 700, 800, 900], italic: true },
  { id: "fraunces", name: "Fraunces", group: "Serif", weights: [400, 500, 600], italic: true },
  { id: "cormorant", name: "Cormorant Garamond", group: "Serif", weights: [500, 600, 700], italic: true },
  { id: "bodoni", name: "Bodoni Moda", group: "Serif", weights: [500, 600, 700, 800, 900], italic: true },
  { id: "gloock", name: "Gloock", group: "Serif", weights: [400] },
  { id: "dmSerif", name: "DM Serif Display", group: "Serif", weights: [400], italic: true },

  { id: "allura", name: "Allura", group: "Script", weights: [400] },
  { id: "alexBrush", name: "Alex Brush", group: "Script", weights: [400] },
  { id: "pinyon", name: "Pinyon Script", group: "Script", weights: [400] },
  { id: "caveat", name: "Caveat", group: "Script", weights: [600, 700] },
  { id: "permanentMarker", name: "Permanent Marker", group: "Script", weights: [400] },

  { id: "interTight", name: "Inter Tight", group: "Sans", weights: [500, 600] },
  { id: "schibsted", name: "Schibsted Grotesk", group: "Sans", weights: [600, 700, 800, 900], italic: true },
  { id: "montserrat", name: "Montserrat", group: "Sans", weights: [700, 800, 900] },
  { id: "bricolage", name: "Bricolage Grotesque", group: "Sans", weights: [600, 700, 800] },
  { id: "jakarta", name: "Plus Jakarta Sans", group: "Sans", weights: [600, 700, 800] },
  { id: "poppins", name: "Poppins", group: "Sans", weights: [600, 700, 800, 900] },
  { id: "geist", name: "Geist", group: "Sans", weights: [500, 600, 700, 800] },
  { id: "spaceGrotesk", name: "Space Grotesk", group: "Sans", weights: [500, 600, 700] },

  { id: "bebas", name: "Bebas Neue", group: "Display", weights: [400] },
  { id: "oswald", name: "Oswald", group: "Display", weights: [600, 700] },
  { id: "unbounded", name: "Unbounded", group: "Display", weights: [600, 700, 800, 900] },
  { id: "luckiest", name: "Luckiest Guy", group: "Display", weights: [400] },
];

export const fontMeta = (id: FontId) => FONTS.find((f) => f.id === id) ?? FONTS[0];

const SCRIPT_FONTS: ScriptFontId[] = ["devanagari", "tamil", "telugu", "kannada", "malayalam", "bengali", "gujarati", "gurmukhi", "odia", "urdu"];

export const FONT_FAMILIES: Record<string, string> = Object.fromEntries([
  ...FONTS.map((f) => [f.id, `'${f.name}', sans-serif`]),
  ...SCRIPT_FONTS.map((s) => [s, "sans-serif"]),
]);
FONT_FAMILIES.sfpro = `"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;
FONT_FAMILIES.timesNewRoman = `"Times New Roman", Times, serif`;
FONT_FAMILIES.editorsNote = `"Editor's Note", "Editors Note", serif`;
FONT_FAMILIES.astonScript = `"Aston Script", cursive`;

/** Licensed fonts an uploaded file can stand in for, matched by file name. */
const LICENSED: { id: FontId; match: RegExp }[] = [
  { id: "editorsNote", match: /editor.?s?.?note/i },
  { id: "astonScript", match: /aston/i },
  { id: "sfpro", match: /sf.?pro/i },
];
const licensedFallback: Record<string, string> = {};

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
  return [FONT_FAMILIES[font] ?? FONT_FAMILIES.sfpro, ...scriptsIn(text).map((s) => FONT_FAMILIES[s])].join(", ");
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
      document.fonts.load(`${style}${weight} 40px ${FONT_FAMILIES[font] ?? "sans-serif"}`, "Aa"),
      ...scripts.map((s) => document.fonts.load(`${Math.min(800, Math.max(400, weight))} 40px ${FONT_FAMILIES[s]}`, text)),
    ]).catch(() => []);
    loaded.set(key, p);
  }
  return p;
}

// ---- Fonts the creator uploads (kept in this browser's IndexedDB) ----

const DB = "lafz-fonts";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("fonts", { keyPath: "name" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const WEIGHTS: [RegExp, number][] = [
  [/hairline|thin/i, 100], [/ultra.?light|extra.?light/i, 200], [/light/i, 300], [/medium/i, 500],
  [/semi.?bold|demi.?bold/i, 600], [/extra.?bold|ultra.?bold|heavy/i, 800], [/black/i, 900], [/bold/i, 700],
];

/** Reads weight, italic and the family from a file name like "SF-Pro-Display-SemiboldItalic". */
function describe(fileName: string) {
  const base = fileName.replace(/\.(ttf|otf|woff2?)$/i, "");
  const weight = WEIGHTS.find(([re]) => re.test(base))?.[1] ?? 400;
  const italic = /italic|oblique/i.test(base);
  const family = base
    .replace(/[-_ ]?(hairline|thin|ultra.?light|extra.?light|light|regular|book|medium|semi.?bold|demi.?bold|extra.?bold|ultra.?bold|heavy|black|bold|italic|oblique)/gi, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return { weight, italic, family: family || base };
}

async function addFace(fileName: string, data: ArrayBuffer): Promise<FontId> {
  const { weight, italic, family } = describe(fileName);
  const licensed = LICENSED.find((l) => l.match.test(family));
  const id = licensed ? licensed.id : `custom:${family}`;
  // One CSS family per font, so each uploaded weight/italic file becomes a face of it.
  const css = `lafz-${id.replace(/[^a-z0-9]+/gi, "-")}`;
  const face = new FontFace(css, data, { weight: String(weight), style: italic ? "italic" : "normal" });
  await face.load();
  document.fonts.add(face);
  if (licensed) {
    // The real SF Pro / Editor's Note / Aston Script: lead that font's stack with it.
    licensedFallback[id] ??= FONT_FAMILIES[id];
    FONT_FAMILIES[id] = `'${css}', ${licensedFallback[id]}`;
    const meta = fontMeta(id);
    meta.kind = undefined;
    meta.weights = [...new Set([...(meta.weights ?? []), weight])].sort((x, y) => x - y);
    if (italic) meta.italic = true;
    return id;
  }
  FONT_FAMILIES[id] = `'${css}'`;
  const existing = FONTS.find((f) => f.id === id);
  if (existing) {
    existing.weights = [...new Set([...existing.weights, weight])].sort((x, y) => x - y);
    if (italic) existing.italic = true;
  } else {
    FONTS.unshift({ id, name: family, group: "Your fonts", weights: [weight], italic, kind: "custom" });
  }
  return id;
}

/**
 * Adds uploaded .ttf/.otf/.woff/.woff2 files and remembers them in this browser. Several files
 * of one family (Regular, Bold, Italic…) become one font with those weights. Returns the font
 * id of the first file.
 */
export async function uploadFonts(files: File[]): Promise<FontId> {
  let first: FontId | null = null;
  for (const file of files) {
    const data = await file.arrayBuffer();
    const id = await addFace(file.name, data);
    first ??= id;
    try {
      const db = await idb();
      db.transaction("fonts", "readwrite").objectStore("fonts").put({ name: file.name, data });
    } catch {
      // Not saved for next time (private mode); it still works in this session.
    }
  }
  if (!first) throw new Error("No font files");
  return first;
}

let restored: Promise<void> | null = null;

/** Re-registers fonts uploaded in earlier sessions. Safe to call many times. */
export function restoreCustomFonts(): Promise<void> {
  if (typeof indexedDB === "undefined") return Promise.resolve();
  return (restored ??= (async () => {
    try {
      const db = await idb();
      const all = await new Promise<{ name: string; data: ArrayBuffer }[]>((resolve, reject) => {
        const req = db.transaction("fonts").objectStore("fonts").getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      for (const f of all) await addFace(f.name, f.data).catch(() => {});
    } catch {}
  })());
}

