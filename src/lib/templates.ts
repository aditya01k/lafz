import { ensureFont, fontMeta, fontStack, isRtl, type FontId } from "./fonts";

import { PRESET_FILES } from "@/presets";
import { TEMPLATE_FILES } from "@/presets/templates";
import { buildLines, lineAt, type Line } from "./lines";
import type { Word } from "./types";

/**
 * One renderer for the live preview and every export, so what the creator sees is what the
 * MP4 gets. Every look is a `Style`: the presets below are just starting values, and the
 * editor can change any field.
 */

export type TemplateId = string;

export type Style = {
  preset: TemplateId;
  font: FontId;
  weight: number;
  italic: boolean;
  /** Text size as a share of the frame's reference width (0.085 ≈ 92 px on a 1080-wide reel). */
  size: number;
  /** Extra space between letters, in em. */
  tracking: number;
  case: "as-is" | "upper" | "lower";
  textColor: string;
  /** How the spoken word stands out. */
  highlight: "color" | "box" | "underline" | "none";
  highlightColor: string;
  /** Highlight only the word being said, or every word said so far. */
  highlightScope: "current" | "spoken";
  /** Every word its own bright colour. */
  rainbow: boolean;
  /** Opacity of words not yet said (1 = no dimming). */
  dim: number;
  /** Show only words already said. */
  reveal: boolean;
  outline: boolean;
  outlineColor: string;
  /** Outline thickness in em. */
  outlineWidth: number;
  shadow: boolean;
  shadowColor: string;
  /** Shadow softness in em. */
  shadowBlur: number;
  background: "none" | "line" | "word";
  backgroundColor: string;
  backgroundOpacity: number;
  /** Corner roundness in em. */
  radius: number;
  animation: "none" | "pop" | "bounce" | "fade" | "slide";
  /** Vertical centre, 0 = top, 1 = bottom. */
  y: number;
  /** Horizontal centre, 0 = left, 1 = right. */
  x: number;
  /** How rows line up with each other. */
  align: "left" | "center" | "right";
  /** Widest a row may be, as a share of the frame width. */
  maxWidth: number;
  wordsPerLine: number;
  /** Most characters in one caption (0 = from words per line). */
  maxChars: number;
  /** Shortest time a caption stays up, in seconds. */
  minDuration: number;
  /** Gap kept between captions, in seconds. */
  gap: number;
  /** One word per row, stacked. */
  stack: boolean;
  emojis: boolean;
};

const BASE: Omit<Style, "preset"> = {
  font: "montserrat", weight: 900, italic: false, size: 0.085, tracking: 0, case: "as-is",
  textColor: "#ffffff", highlight: "color", highlightColor: "#ffe600", highlightScope: "current",
  rainbow: false, dim: 1, reveal: false,
  outline: true, outlineColor: "#000000", outlineWidth: 0.16,
  shadow: false, shadowColor: "#000000", shadowBlur: 0.25,
  background: "none", backgroundColor: "#000000", backgroundOpacity: 0.6, radius: 0.2,
  animation: "pop", y: 0.66, x: 0.5, align: "center", maxWidth: 0.86, wordsPerLine: 3, maxChars: 0, minDuration: 0, gap: 0, stack: false, emojis: false,
};

export type Template = { id: TemplateId; name: string; blurb: string; bestFor?: string; credit?: { name: string; url?: string }; style: Style };

type PresetFile = { id: string; name: string; blurb: string; bestFor?: string; credit?: { name: string; url?: string }; style: object };
const toTemplate = (f: PresetFile): Template => ({
  id: f.id,
  name: f.name,
  blurb: f.blurb,
  bestFor: f.bestFor,
  credit: f.credit,
  style: { ...BASE, ...(f.style as Partial<Style>), preset: f.id },
});

// Presets live as JSON files in src/presets/ so anyone can contribute one (credited to them).
/** The four presets editors start from in the Style tab. */
export const TEMPLATES: Template[] = (PRESET_FILES as PresetFile[]).map(toTemplate);
/** Every ready-made look: the presets plus the templates, for the simple picker. */
export const LOOKS: Template[] = [...TEMPLATES, ...(TEMPLATE_FILES as PresetFile[]).map(toTemplate)];

export const templateById = (id: string) => LOOKS.find((x) => x.id === id) ?? TEMPLATES[0];

export function defaultStyle(id: TemplateId = "headline"): Style {
  return { ...templateById(id).style };
}

/** Old saved projects stored a smaller style; give them a full one. */
export function normalizeStyle(s: Partial<Style> & { template?: string }): Style {
  // Saved with a full style: keep it (its preset may since have been retired).
  if (s.font && s.preset) return { ...defaultStyle(templateById(s.preset).id), ...s } as Style;
  const base = defaultStyle(templateById(s.template ?? s.preset ?? "headline").id);
  return { ...base, ...(typeof s.size === "number" && s.size > 0.3 ? { size: base.size * s.size } : {}), ...(s.y ? { y: s.y } : {}) };
}

export function lineBudget(style: Style) {
  const words = style.stack ? Math.min(style.wordsPerLine, 3) : style.wordsPerLine;
  return { maxWords: words, maxChars: style.maxChars > 0 ? style.maxChars : Math.max(12, words * 7) };
}

/** Everything buildLines needs from a style. */
export function lineRules(style: Style) {
  const b = lineBudget(style);
  return { ...b, minDuration: style.minDuration ?? 0, gap: style.gap ?? 0 };
}

/** Captions for a style: one place, so preview, demos and export always agree. */
export const linesFor = (words: Word[], style: Style) => {
  const r = lineRules(style);
  return buildLines(words, r.maxWords, r.maxChars, r);
};

const RAINBOW = ["#ffe600", "#ff4fd8", "#2ee6ff", "#3cff7a", "#ff8a1f"];

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;

function hexAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const v = parseInt(n, 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${a})`;
}

/** Dark or white text, whichever reads on this background. */
function onColor(hex: string) {
  const v = parseInt(hex.replace("#", "").slice(0, 6).padEnd(6, "0"), 16);
  const l = (0.299 * ((v >> 16) & 255) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255;
  return l > 0.6 ? "#111111" : "#ffffff";
}

function activeIndex(words: Word[], t: number) {
  let idx = -1;
  for (let i = 0; i < words.length; i++) if (words[i].start <= t) idx = i;
  return idx;
}

type Placed = { i: number; x: number; y: number; w: number; row: number };

export type Box = { x: number; y: number; w: number; h: number };

/**
 * Draws whatever caption is on screen at time t. The caller clears or draws the frame first.
 * Returns the caption's box (for dragging it on the preview), or null when nothing is up.
 */
export function drawCaptions(ctx: Ctx, W: number, H: number, t: number, lines: Line[], style: Style): Box | null {
  const line = lineAt(lines, t);
  if (!line) return null;
  // Styles saved before a field existed get its default.
  const s: Style = { ...BASE, ...style };
  const ref = Math.min(W, H * 0.75);
  const px = s.size * ref;
  const texts = line.words.map((w) => (s.case === "upper" ? w.text.toUpperCase() : s.case === "lower" ? w.text.toLowerCase() : w.text));
  const all = texts.join(" ");
  const act = activeIndex(line.words, t);

  ctx.save();
  ctx.font = `${s.italic ? "italic " : ""}${s.weight} ${px}px ${fontStack(s.font, all)}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D).letterSpacing = `${s.tracking * px}px`;

  // Lay out words in rows that fit 86% of the width (or one per row when stacked).
  const pad = s.background === "word" ? 0.3 * px : 0;
  const gap = (s.background === "word" ? 0.18 : s.highlight === "box" ? 0.5 : s.animation === "pop" || s.animation === "bounce" ? 0.4 : 0.28) * px;
  const lead = (s.stack ? 1.04 : s.background === "word" || s.background === "line" ? 1.45 : 1.2) * px;
  const widths = texts.map((x) => ctx.measureText(x).width + pad * 2);
  const rows: number[][] = [[]];
  let rowW = 0;
  widths.forEach((w, i) => {
    const row = rows.at(-1)!;
    if (row.length && (s.stack || rowW + gap + w > W * s.maxWidth)) {
      rows.push([i]);
      rowW = w;
    } else {
      rowW += (row.length ? gap : 0) + w;
      row.push(i);
    }
  });
  const rtl = isRtl(all);
  const top = s.y * H - ((rows.length - 1) * lead) / 2;
  const placed: Placed[] = [];
  const rowW2 = rows.map((row) => row.reduce((sum, i) => sum + widths[i], 0) + gap * (row.length - 1));
  const blockW = Math.max(...rowW2);
  // Keep the block inside the frame wherever it's placed.
  const blockLeft = clamp(s.x * W - blockW / 2, W * 0.02, Math.max(W * 0.02, W * 0.98 - blockW));
  rows.forEach((row, r) => {
    const order = rtl ? [...row].reverse() : row;
    const total = rowW2[r];
    const align = rtl && s.align !== "center" ? (s.align === "left" ? "right" : "left") : s.align;
    let x = align === "left" ? blockLeft : align === "right" ? blockLeft + blockW - total : blockLeft + (blockW - total) / 2;
    for (const i of order) {
      placed.push({ i, x, y: top + r * lead, w: widths[i], row: r });
      x += widths[i] + gap;
    }
  });

  const visible = (i: number) => !s.reveal || line.words[i].start <= t;

  // A band behind each row.
  if (s.background === "line") {
    rows.forEach((_, r) => {
      const inRow = placed.filter((p) => p.row === r && visible(p.i));
      if (!inRow.length) return;
      const x0 = Math.min(...inRow.map((p) => p.x)) - px * 0.4;
      const x1 = Math.max(...inRow.map((p) => p.x + p.w)) + px * 0.4;
      pill(ctx, x0, inRow[0].y - px * 0.68, x1 - x0, px * 1.36, s.radius * px, hexAlpha(s.backgroundColor, s.backgroundOpacity));
    });
  }

  for (const p of placed) {
    if (!visible(p.i)) continue;
    const w = line.words[p.i];
    const spoken = w.start <= t;
    const isActive = p.i === act;
    const lit = s.highlight !== "none" && (s.highlightScope === "spoken" ? spoken : isActive);
    const age = t - w.start;

    // Motion: the word being said (or, when revealing, each word as it appears).
    let scale = 1;
    let dy = 0;
    let alpha = spoken ? 1 : s.dim;
    const animates = isActive || (s.reveal && spoken && age < 0.3);
    if (animates) {
      const k = easeOut(clamp(age / 0.18));
      if (s.animation === "pop") scale = 1 + 0.2 * (1 - k);
      if (s.animation === "bounce") dy = -Math.sin(clamp(age / 0.25) * Math.PI) * 0.18 * px;
      if (s.animation === "fade") alpha *= clamp(age / 0.15);
      if (s.animation === "slide") {
        dy = (1 - k) * 0.35 * px;
        alpha *= k;
      }
    }
    if (isActive && s.highlight === "color" && s.animation !== "none") scale *= 1.04;

    let fill = s.rainbow ? RAINBOW[(Number(w.id.replace(/\D/g, "")) || p.i) % RAINBOW.length] : s.textColor;
    if ((lit && s.highlight === "color") || w.emphasis) fill = s.highlightColor;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x + p.w / 2, p.y + dy);
    ctx.scale(scale, scale);
    const x = -p.w / 2 + pad;

    const boxed = lit && s.highlight === "box";
    if (s.background === "word" || boxed) {
      const bg = boxed ? s.highlightColor : hexAlpha(s.backgroundColor, s.backgroundOpacity);
      // A box needs room around the word even when the style has no word padding.
      const extra = pad ? 0 : px * 0.22;
      pill(ctx, -p.w / 2 - extra, -px * 0.66, p.w + extra * 2, px * 1.32, s.radius * px, bg);
      if (boxed) fill = onColor(s.highlightColor);
    }
    if (s.shadow && !boxed) {
      ctx.shadowColor = s.shadowColor;
      ctx.shadowBlur = s.shadowBlur * px;
      // Dark shadows drop slightly; coloured ones (glows) stay centred.
      ctx.shadowOffsetY = /^#0{6}/i.test(s.shadowColor) ? px * 0.06 : 0;
    }
    if (s.outline && !boxed) {
      ctx.strokeStyle = s.outlineColor;
      ctx.lineWidth = s.outlineWidth * px;
      ctx.strokeText(texts[p.i], x, 0);
      // Shadow once, under the outline, not again under the fill.
      ctx.shadowColor = "transparent";
    }
    ctx.fillStyle = fill;
    ctx.fillText(texts[p.i], x, 0);
    if (lit && s.highlight === "underline") {
      ctx.shadowColor = "transparent";
      ctx.fillStyle = s.highlightColor;
      ctx.fillRect(x, px * 0.52, p.w - pad * 2, Math.max(2, px * 0.09));
    }
    ctx.restore();
  }

  if (s.emojis) {
    const said = line.words.filter((w) => w.emoji && w.start <= t).at(-1);
    if (said?.emoji) {
      const k = 1 + 0.35 * (1 - easeOut(clamp((t - said.start) / 0.16)));
      ctx.font = `${px * 1.3 * k}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.globalAlpha = 1;
      ctx.fillText(said.emoji, blockLeft + blockW / 2, top - px * 1.5);
    }
  }
  ctx.restore();
  return { x: blockLeft - px * 0.3, y: top - lead / 2, w: blockW + px * 0.6, h: rows.length * lead };
}

function pill(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, h / 2));
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Loads the faces a style needs for this text before drawing or exporting. */
export function loadFonts(style?: Style, text = "") {
  if (style) return ensureFont(style.font, style.weight, text, style.italic);
  return Promise.all(TEMPLATES.map((x) => ensureFont(x.style.font, x.style.weight, text, x.style.italic)));
}

export const fontLabel = (s: Style) => fontMeta(s.font).name;
