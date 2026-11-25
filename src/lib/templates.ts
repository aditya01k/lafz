import { lineAt, type Line } from "./lines";
import type { Word } from "./types";

/**
 * One renderer for the live preview and every export, so what the creator sees
 * is what the MP4 gets.
 */

export type FontKey = "montserrat" | "anton" | "poppins" | "inter" | "bebas";

// Filled in by the app from next/font so canvas uses the same loaded faces.
export const FONT_FAMILIES: Record<FontKey, string> = {
  montserrat: "Montserrat, sans-serif",
  anton: "Anton, sans-serif",
  poppins: "Poppins, sans-serif",
  inter: "Inter, sans-serif",
  bebas: "'Bebas Neue', sans-serif",
};

export type TemplateId =
  | "pop" | "punch" | "karaoke" | "bubble" | "classic"
  | "minimal" | "bazaar" | "neon" | "typewriter" | "headline";

export type Style = {
  template: TemplateId;
  /** Multiplies the template's text size. */
  size: number;
  /** Vertical centre of the captions, 0 = top, 1 = bottom. */
  y: number;
  uppercase: boolean;
  emojis: boolean;
  /** Overrides the template's words per line. */
  wordsPerLine: number | null;
  textColor: string | null;
  highlightColor: string | null;
};

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type Args = {
  ctx: Ctx;
  W: number;
  H: number;
  t: number;
  line: Line;
  texts: string[];
  px: number;
  cy: number;
  text: string;
  hi: string;
  tpl: Template;
};

export type Template = {
  id: TemplateId;
  name: string;
  blurb: string;
  font: FontKey;
  weight: number;
  /** Text size as a share of the frame's reference width. */
  size: number;
  maxWords: number;
  maxChars: number;
  y: number;
  uppercase: boolean;
  text: string;
  hi: string;
  render: (a: Args) => void;
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;

/** The word being spoken, or the last one spoken in a pause. */
function activeIndex(words: Word[], t: number) {
  let idx = -1;
  for (let i = 0; i < words.length; i++) if (words[i].start <= t) idx = i;
  return idx;
}

/** Pop-in scale for a word that just started. */
const pop = (w: Word, t: number, amp = 0.18) => 1 + amp * (1 - easeOut(clamp((t - w.start) / 0.16)));

type Placed = { i: number; x: number; y: number; w: number };

/** Wraps words into centred rows that fit 86% of the frame width. */
function layout(a: Args, opts: { gap?: number; lead?: number; pad?: number } = {}): Placed[] {
  const { ctx, W, px, cy, texts } = a;
  const gap = (opts.gap ?? 0.28) * px;
  const pad = (opts.pad ?? 0) * px;
  const lead = (opts.lead ?? 1.18) * px;
  const maxW = W * 0.86;
  const widths = texts.map((s) => ctx.measureText(s).width + pad * 2);
  const rows: number[][] = [[]];
  let rowW = 0;
  widths.forEach((w, i) => {
    const row = rows.at(-1)!;
    if (row.length && rowW + gap + w > maxW) {
      rows.push([i]);
      rowW = w;
    } else {
      rowW += (row.length ? gap : 0) + w;
      row.push(i);
    }
  });
  const top = cy - ((rows.length - 1) * lead) / 2;
  const placed: Placed[] = [];
  rows.forEach((row, r) => {
    const total = row.reduce((s, i) => s + widths[i], 0) + gap * (row.length - 1);
    let x = W / 2 - total / 2;
    for (const i of row) {
      placed.push({ i, x, y: top + r * lead, w: widths[i] });
      x += widths[i] + gap;
    }
  });
  return placed;
}

function setFont(a: Args, scale = 1) {
  a.ctx.font = `${a.tpl.weight} ${a.px * scale}px ${FONT_FAMILIES[a.tpl.font]}`;
  a.ctx.textBaseline = "middle";
  a.ctx.textAlign = "left";
  a.ctx.lineJoin = "round";
}

/** Draws text scaled about its own centre. */
function word(
  a: Args,
  s: string,
  p: Placed,
  opts: { fill: string; stroke?: string; strokeW?: number; scale?: number; shadow?: string; blur?: number; alpha?: number; pad?: number },
) {
  const { ctx, px } = a;
  const scale = opts.scale ?? 1;
  const pad = (opts.pad ?? 0) * px;
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.translate(p.x + p.w / 2, p.y);
  ctx.scale(scale, scale);
  const x = -p.w / 2 + pad;
  if (opts.shadow) {
    ctx.shadowColor = opts.shadow;
    ctx.shadowBlur = (opts.blur ?? 0.25) * px;
  }
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = (opts.strokeW ?? 0.16) * px;
    ctx.strokeText(s, x, 0);
    ctx.shadowColor = "transparent";
  }
  ctx.fillStyle = opts.fill;
  ctx.fillText(s, x, 0);
  ctx.restore();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

const emphasized = (a: Args, i: number) => a.line.words[i].emphasis;

export const TEMPLATES: Template[] = [
  {
    id: "pop", name: "Pop", blurb: "One word at a time, big and punchy",
    font: "montserrat", weight: 900, size: 0.11, maxWords: 1, maxChars: 14, y: 0.62, uppercase: false,
    text: "#ffffff", hi: "#ffe600",
    render(a) {
      setFont(a);
      const w = a.line.words[0];
      for (const p of layout(a)) {
        word(a, a.texts[p.i], p, {
          fill: emphasized(a, p.i) ? a.hi : a.text, stroke: "#000", strokeW: 0.2, scale: pop(w, a.t, 0.25),
        });
      }
    },
  },
  {
    id: "punch", name: "Punch", blurb: "Bold caps, the spoken word lights up",
    font: "anton", weight: 400, size: 0.085, maxWords: 3, maxChars: 18, y: 0.66, uppercase: true,
    text: "#ffffff", hi: "#ffe600",
    render(a) {
      setFont(a);
      const act = activeIndex(a.line.words, a.t);
      // Wide gap: the spoken word grows and mustn't touch its neighbours.
      for (const p of layout(a, { gap: 0.45 })) {
        const on = p.i === act;
        word(a, a.texts[p.i], p, {
          fill: on || emphasized(a, p.i) ? a.hi : a.text, stroke: "#000", strokeW: 0.18,
          scale: on ? 1.05 * pop(a.line.words[p.i], a.t, 0.08) : 1, shadow: "rgba(0,0,0,0.5)", blur: 0.2,
        });
      }
    },
  },
  {
    id: "karaoke", name: "Karaoke", blurb: "Words fill with colour as they're said",
    font: "poppins", weight: 800, size: 0.06, maxWords: 6, maxChars: 34, y: 0.72, uppercase: false,
    text: "#ffffff", hi: "#3cff7a",
    render(a) {
      setFont(a);
      for (const p of layout(a)) {
        const said = a.line.words[p.i].start <= a.t;
        word(a, a.texts[p.i], p, {
          fill: said || emphasized(a, p.i) ? a.hi : a.text, stroke: "#000", strokeW: 0.14,
        });
      }
    },
  },
  {
    id: "bubble", name: "Bubble", blurb: "Each word in its own pill",
    font: "poppins", weight: 700, size: 0.058, maxWords: 4, maxChars: 26, y: 0.7, uppercase: false,
    text: "#111111", hi: "#ff5a36",
    render(a) {
      setFont(a);
      const act = activeIndex(a.line.words, a.t);
      for (const p of layout(a, { pad: 0.32, gap: 0.18, lead: 1.5 })) {
        const on = p.i === act || emphasized(a, p.i);
        const s = p.i === act ? pop(a.line.words[p.i], a.t, 0.08) : 1;
        a.ctx.save();
        a.ctx.translate(p.x + p.w / 2, p.y);
        a.ctx.scale(s, s);
        roundRect(a.ctx, -p.w / 2, -a.px * 0.66, p.w, a.px * 1.32, a.px * 0.4, on ? a.hi : "#ffffff");
        a.ctx.restore();
        word(a, a.texts[p.i], p, { fill: on ? "#ffffff" : a.text, pad: 0.32, scale: s });
      }
    },
  },
  {
    id: "classic", name: "Classic", blurb: "Clean subtitles on a dark band",
    font: "inter", weight: 600, size: 0.045, maxWords: 9, maxChars: 44, y: 0.82, uppercase: false,
    text: "#ffffff", hi: "#ffe600",
    render(a) {
      setFont(a);
      const placed = layout(a, { gap: 0.26, lead: 1.35 });
      const rows = new Map<number, Placed[]>();
      for (const p of placed) rows.set(p.y, [...(rows.get(p.y) ?? []), p]);
      for (const [y, row] of rows) {
        const x0 = row[0].x - a.px * 0.4;
        const x1 = row.at(-1)!.x + row.at(-1)!.w + a.px * 0.4;
        roundRect(a.ctx, x0, y - a.px * 0.68, x1 - x0, a.px * 1.36, a.px * 0.18, "rgba(0,0,0,0.62)");
      }
      for (const p of placed) word(a, a.texts[p.i], p, { fill: emphasized(a, p.i) ? a.hi : a.text });
    },
  },
  {
    id: "minimal", name: "Minimal", blurb: "Soft lowercase, unspoken words dimmed",
    font: "inter", weight: 600, size: 0.052, maxWords: 5, maxChars: 30, y: 0.7, uppercase: false,
    text: "#ffffff", hi: "#ffffff",
    render(a) {
      setFont(a);
      for (const p of layout(a)) {
        const said = a.line.words[p.i].start <= a.t;
        word(a, a.texts[p.i].toLowerCase(), p, {
          fill: emphasized(a, p.i) ? a.hi : a.text, alpha: said ? 1 : 0.45, shadow: "rgba(0,0,0,0.55)", blur: 0.3,
        });
      }
    },
  },
  {
    id: "bazaar", name: "Bazaar", blurb: "Loud colours, every word different",
    font: "anton", weight: 400, size: 0.09, maxWords: 3, maxChars: 18, y: 0.64, uppercase: true,
    text: "#ffffff", hi: "#ffe600",
    render(a) {
      setFont(a);
      const palette = ["#ffe600", "#ff4fd8", "#2ee6ff", "#3cff7a", "#ff8a1f"];
      const act = activeIndex(a.line.words, a.t);
      for (const p of layout(a, { gap: 0.45 })) {
        const w = a.line.words[p.i];
        const color = palette[(Number(w.id.replace(/\D/g, "")) || p.i) % palette.length];
        word(a, a.texts[p.i], p, {
          fill: color, stroke: "#000", strokeW: 0.2, scale: p.i === act ? pop(w, a.t, 0.2) : 1,
        });
      }
    },
  },
  {
    id: "neon", name: "Neon", blurb: "Glowing condensed type",
    font: "bebas", weight: 400, size: 0.1, maxWords: 3, maxChars: 20, y: 0.64, uppercase: true,
    text: "#ffffff", hi: "#ff4fd8",
    render(a) {
      setFont(a);
      const act = activeIndex(a.line.words, a.t);
      for (const p of layout(a, { gap: 0.36 })) {
        const on = p.i === act || emphasized(a, p.i);
        word(a, a.texts[p.i], p, {
          fill: on ? a.hi : a.text, shadow: on ? a.hi : "#2ee6ff", blur: 0.5,
          scale: p.i === act ? pop(a.line.words[p.i], a.t, 0.1) : 1,
        });
      }
    },
  },
  {
    id: "typewriter", name: "Typewriter", blurb: "Words appear as they're spoken",
    font: "poppins", weight: 600, size: 0.05, maxWords: 6, maxChars: 34, y: 0.74, uppercase: false,
    text: "#ffffff", hi: "#ffe600",
    render(a) {
      setFont(a);
      for (const p of layout(a, { lead: 1.45 })) {
        const w = a.line.words[p.i];
        if (w.start > a.t) continue;
        roundRect(a.ctx, p.x - a.px * 0.14, p.y - a.px * 0.62, p.w + a.px * 0.28, a.px * 1.24, a.px * 0.12, "rgba(0,0,0,0.78)");
        word(a, a.texts[p.i], p, { fill: emphasized(a, p.i) ? a.hi : a.text, alpha: clamp((a.t - w.start) / 0.08) });
      }
    },
  },
  {
    id: "headline", name: "Headline", blurb: "Two huge words, stacked",
    font: "montserrat", weight: 900, size: 0.12, maxWords: 2, maxChars: 14, y: 0.6, uppercase: true,
    text: "#ffffff", hi: "#ffe600",
    render(a) {
      setFont(a);
      const act = activeIndex(a.line.words, a.t);
      // One word per row: the second row takes the highlight colour.
      const lead = a.px * 1.05;
      const top = a.cy - ((a.texts.length - 1) * lead) / 2;
      a.texts.forEach((s, i) => {
        const w = a.ctx.measureText(s).width;
        const p = { i, x: a.W / 2 - w / 2, y: top + i * lead, w };
        word(a, s, p, {
          fill: i % 2 || emphasized(a, i) ? a.hi : a.text, stroke: "#000", strokeW: 0.16,
          scale: i === act ? pop(a.line.words[i], a.t, 0.14) : 1,
        });
      });
    },
  },
];

export const templateById = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export function defaultStyle(id: TemplateId = "punch"): Style {
  const t = templateById(id);
  return {
    template: id, size: 1, y: t.y, uppercase: t.uppercase, emojis: false,
    wordsPerLine: null, textColor: null, highlightColor: null,
  };
}

export function lineBudget(style: Style) {
  const t = templateById(style.template);
  const words = style.wordsPerLine ?? t.maxWords;
  return { maxWords: words, maxChars: Math.max(t.maxChars, words * 6) };
}

/** Draws whatever caption is on screen at time t. The caller clears or draws the frame first. */
export function drawCaptions(ctx: Ctx, W: number, H: number, t: number, lines: Line[], style: Style) {
  const line = lineAt(lines, t);
  if (!line) return;
  const tpl = templateById(style.template);
  const ref = Math.min(W, H * 0.75);
  const px = tpl.size * ref * style.size;
  const texts = line.words.map((w) => (style.uppercase ? w.text.toUpperCase() : w.text));
  const args: Args = {
    ctx, W, H, t, line, texts, px, cy: style.y * H, tpl,
    text: style.textColor ?? tpl.text, hi: style.highlightColor ?? tpl.hi,
  };
  ctx.save();
  tpl.render(args);
  if (style.emojis) drawEmoji(args);
  ctx.restore();
}

function drawEmoji(a: Args) {
  const said = a.line.words.filter((w) => w.emoji && w.start <= a.t).at(-1);
  if (!said?.emoji) return;
  const s = a.px * 1.3 * pop(said, a.t, 0.35);
  a.ctx.font = `${s}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  a.ctx.textAlign = "center";
  a.ctx.textBaseline = "middle";
  a.ctx.fillText(said.emoji, a.W / 2, a.cy - a.px * 1.9);
}

/** Waits for every caption face so the first exported frame isn't in a fallback font. */
export async function loadFonts() {
  await Promise.all(
    TEMPLATES.map((t) => document.fonts.load(`${t.weight} 40px ${FONT_FAMILIES[t.font]}`).catch(() => [])),
  );
}
