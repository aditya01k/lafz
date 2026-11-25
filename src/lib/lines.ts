import type { Word } from "./types";

export type Line = { words: Word[]; start: number; end: number };

const PAUSE = 0.7;
const HOLD = 0.35;

/**
 * Groups words into caption lines: a new line on the user's own break, a long
 * pause, the end of a sentence, or when the template's word/character budget is full.
 */
export function buildLines(words: Word[], maxWords: number, maxChars: number): Line[] {
  const lines: Line[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) lines.push({ words: cur, start: cur[0].start, end: cur.at(-1)!.end });
    cur = [];
  };
  for (const w of words) {
    const prev = cur.at(-1);
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (
      prev &&
      (w.breakBefore ||
        cur.length >= maxWords ||
        chars > maxChars ||
        w.start - prev.end > PAUSE ||
        /[.?!]$/.test(prev.text))
    ) {
      flush();
    }
    cur.push(w);
  }
  flush();
  // Hold each line until the next starts (short gaps) so captions don't flicker.
  for (let i = 0; i < lines.length; i++) {
    const next = lines[i + 1];
    lines[i].end = next && next.start - lines[i].end < PAUSE ? next.start : lines[i].end + HOLD;
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

export function toSrt(lines: Line[]): string {
  return lines
    .map((l, i) => `${i + 1}\n${stamp(l.start, ",")} --> ${stamp(l.end, ",")}\n${l.words.map((w) => w.text).join(" ")}\n`)
    .join("\n");
}

export function toVtt(lines: Line[]): string {
  return (
    "WEBVTT\n\n" +
    lines.map((l) => `${stamp(l.start, ".")} --> ${stamp(l.end, ".")}\n${l.words.map((w) => w.text).join(" ")}\n`).join("\n")
  );
}

export function toText(words: Word[]): string {
  return words.map((w) => w.text).join(" ").replace(/\s+([?!])/g, "$1");
}
