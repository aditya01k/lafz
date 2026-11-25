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
