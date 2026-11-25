import type { Word } from "./types";

export type Line = { words: Word[]; start: number; end: number };

const PAUSE = 0.7;
const HOLD = 0.35;

/** Caption rules, like Premiere's "Create captions" settings. */
export type Rules = {
  maxWords: number;
  maxChars: number;
  /** Shortest a caption stays on screen, in seconds. */
  minDuration?: number;
  /** Space kept between one caption's end and the next one's start, in seconds. */
  gap?: number;
};

/**
 * Groups words into captions: a new caption on the user's own break, a long pause, the end of a
 * sentence, or when the word/character budget is full. Words marked keepWithPrev (captions the
 * user merged, typed or imported) stay together whatever the rules say.
 */
export function buildLines(words: Word[], maxWords: number, maxChars: number, rules: Partial<Rules> = {}): Line[] {
  const lines: Line[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) lines.push({ words: cur, start: cur[0].start, end: cur.at(-1)!.end });
    cur = [];
  };
  for (const w of words) {
    const prev = cur.at(-1);
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    const auto = !w.keepWithPrev && (cur.length >= maxWords || chars > maxChars || (prev && w.start - prev.end > PAUSE) || (prev && /[.?!]$/.test(prev.text)));
    if (prev && (w.breakBefore || prev.outAt !== undefined || auto)) flush();
    cur.push(w);
  }
  flush();
  const gap = rules.gap ?? 0;
  const minDur = rules.minDuration ?? 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const out = line.words.at(-1)!.outAt;
    if (out !== undefined) {
      // A trimmed caption keeps exactly the out point the user set.
      line.end = out;
    } else {
      // Hold each caption until the next starts (short gaps) so captions don't flicker.
      line.end = next && next.start - line.end < PAUSE ? next.start : line.end + HOLD;
      line.end = Math.max(line.end, line.start + minDur);
    }
    if (next) line.end = Math.min(line.end, next.start - gap);
    line.end = Math.max(line.end, line.start + 0.05);
  }
  return lines;
}

export function lineAt(lines: Line[], t: number): Line | undefined {
  // Lines are sorted; binary search keeps export fast on long videos.
  let lo = 0;
  let hi = lines.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (t < lines[mid].start) hi = mid - 1;
    else if (t >= lines[mid].end) lo = mid + 1;
    else return lines[mid];
  }
  return undefined;
}

const stamp = (s: number, sep: "," | ".") => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(sec)}${sep}${p(ms % 1000, 3)}`;
};

export type SubOptions = { /** Wrap into lines of at most this many characters (0 = no wrap). */ maxLineChars?: number; maxLines?: number };

/** Breaks a caption into balanced lines, as subtitle guides ask (e.g. 42 characters, 2 lines). */
export function wrapText(text: string, { maxLineChars = 0, maxLines = 2 }: SubOptions = {}): string {
  if (!maxLineChars || text.length <= maxLineChars) return text;
  const words = text.split(" ");
  const n = Math.min(maxLines, Math.ceil(text.length / maxLineChars));
  const target = text.length / n;
  const rows: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && rows.length < n - 1 && (next.length > maxLineChars || next.length > target + 4)) {
      rows.push(cur);
      cur = w;
    } else cur = next;
  }
  rows.push(cur);
  return rows.join("\n");
}

const lineText = (l: Line, o?: SubOptions) => wrapText(l.words.map((w) => w.text).join(" "), o);

export function toSrt(lines: Line[], o?: SubOptions): string {
  return lines.map((l, i) => `${i + 1}\n${stamp(l.start, ",")} --> ${stamp(l.end, ",")}\n${lineText(l, o)}\n`).join("\n");
}

export function toVtt(lines: Line[], o?: SubOptions): string {
  return "WEBVTT\n\n" + lines.map((l) => `${stamp(l.start, ".")} --> ${stamp(l.end, ".")}\n${lineText(l, o)}\n`).join("\n");
}

/** Look of an ASS file. Sizes are in pixels of the frame (`width` x `height`). */
export type AssOptions = {
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
  bold: boolean;
  /** Colour of words not yet said. */
  textColor: string;
  /** Colour a word turns when it is said. */
  highlightColor: string;
  outlineColor: string;
  outlineWidth: number;
  /** Vertical centre, 0 = top, 1 = bottom (as in the editor). */
  y: number;
};

/** ASS colours are &HAABBGGRR: blue and red swap places compared with CSS hex. */
export function assColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const h = (m ? m[1] : "ffffff").toUpperCase();
  return `&H00${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`;
}

/** ASS time is h:mm:ss.cc (centiseconds). */
export function assTime(s: number): string {
  const cs = Math.max(0, Math.round(s * 100));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(cs / 360000)}:${p(Math.floor((cs % 360000) / 6000))}:${p(Math.floor((cs % 6000) / 100))}.${p(cs % 100)}`;
}

// Braces start override tags and backslashes start escapes in ASS, so a word can't carry them.
const assText = (t: string) => t.replace(/\{/g, "(").replace(/\}/g, ")").replace(/\\/g, "/");

/**
 * Advanced SubStation (.ass) with word-by-word karaoke: each word carries a \k tag with the time
 * until the next word, so players (libass: VLC, mpv, Aegisub, ffmpeg) colour words as they are
 * said, in the editor's own colours. Each caption is one event; the player wraps long ones.
 */
export function toAss(lines: Line[], o: AssOptions): string {
  const style = [
    "Style: Default", o.fontName, Math.round(o.fontSize), assColor(o.highlightColor), assColor(o.textColor), assColor(o.outlineColor),
    "&H64000000", o.bold ? -1 : 0, 0, 0, 0, 100, 100, 0, 0, 1, Math.round(o.outlineWidth * 1000) / 1000, 0, 2, 40, 40,
    Math.round((1 - o.y) * o.height), 1,
  ].join(",");
  const events = lines.map((l) => {
    const text = l.words
      .map((w, i) => {
        const until = l.words[i + 1]?.start ?? w.end;
        const cs = Math.max(1, Math.round((until - w.start) * 100));
        return `{\\k${cs}}${assText(w.text)}`;
      })
      .join(" ");
    return `Dialogue: 0,${assTime(l.start)},${assTime(l.end)},Default,,0,0,0,,${text}`;
  });
  return [
    "[Script Info]",
    "; Made with lafz",
    "ScriptType: v4.00+",
    `PlayResX: ${o.width}`,
    `PlayResY: ${o.height}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    style,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
}

export function toText(words: Word[]): string {
  return words.map((w) => w.text).join(" ").replace(/\s+([?!])/g, "$1");
}

/** Reads SRT or VTT into cues. Lenient: any "a --> b" line starts a cue. */
export function parseSubtitles(text: string): { start: number; end: number; text: string }[] {
  const t = (v: string) => {
    const m = v.trim().replace(",", ".").match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/);
    return m ? Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) : NaN;
  };
  const cues: { start: number; end: number; text: string }[] = [];
  const blocks = text.replace(/\r/g, "").split(/\n\s*\n/);
  for (const b of blocks) {
    const lines = b.split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, z] = lines[i].split("-->");
    const body = lines.slice(i + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    const start = t(a);
    const end = t(z.split(" ").filter(Boolean)[0] ?? z);
    if (body && Number.isFinite(start) && Number.isFinite(end) && end > start) cues.push({ start, end, text: body });
  }
  return cues.sort((x, y) => x.start - y.start);
}
