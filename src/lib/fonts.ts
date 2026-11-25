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

async function addFace(name: string, data: ArrayBuffer) {
  const family = `lafz-custom-${name.replace(/[^a-z0-9]+/gi, "-")}`;
  const face = new FontFace(family, data);
  await face.load();
  document.fonts.add(face);
  const licensed = LICENSED.find((l) => l.match.test(name));
  if (licensed) {
    // The real Editor's Note / Aston Script: lead that font's stack with it.
    licensedFallback[licensed.id] ??= FONT_FAMILIES[licensed.id];
    FONT_FAMILIES[licensed.id] = `'${family}', ${licensedFallback[licensed.id]}`;
    fontMeta(licensed.id).kind = undefined;
    return licensed.id;
  }
  const id = `custom:${name}`;
  FONT_FAMILIES[id] = `'${family}'`;
  if (!FONTS.some((f) => f.id === id)) FONTS.unshift({ id, name, group: "Your fonts", weights: [400], kind: "custom" });
  return id;
}

/** Adds an uploaded .ttf/.otf/.woff/.woff2 and remembers it for next time. Returns its font id. */
export async function uploadFont(file: File): Promise<FontId> {
  const name = file.name.replace(/\.(ttf|otf|woff2?)$/i, "").replace(/[-_]+/g, " ").trim() || "My font";
  const data = await file.arrayBuffer();
  const id = await addFace(name, data);
  try {
    const db = await idb();
    db.transaction("fonts", "readwrite").objectStore("fonts").put({ name, data });
  } catch {
    // Not saved for next time (private mode); it still works in this session.
  }
  return id;
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

