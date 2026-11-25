import type { Word } from "./types";

/** Pure edits on the word list; the editor keeps each result for undo. */

let seq = 0;
const newId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Rewrites a word. Typing a space splits it, sharing the original time by length. */
export function editWord(words: Word[], id: string, text: string): Word[] {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  return words.flatMap((w) => {
    if (w.id !== id) return [w];
    if (!parts.length) return [];
    if (parts.length === 1) return [{ ...w, text: parts[0] }];
    const total = parts.reduce((n, p) => n + p.length, 0);
    let t = w.start;
    return parts.map((p, i) => {
      const dur = ((w.end - w.start) * p.length) / total;
      const piece: Word = { ...w, id: i ? newId() : w.id, text: p, start: t, end: t + dur, breakBefore: i ? false : w.breakBefore };
      t += dur;
      return piece;
    });
  });
}

export const deleteWord = (words: Word[], id: string) => words.filter((w) => w.id !== id);

export const toggle = (words: Word[], id: string, key: "emphasis" | "breakBefore") =>
  words.map((w) => (w.id === id ? { ...w, [key]: !w[key] } : w));

export function insertAfter(words: Word[], id: string, text: string): Word[] {
  const i = words.findIndex((w) => w.id === id);
  if (i < 0 || !text.trim()) return words;
  const a = words[i];
  const nextStart = words[i + 1]?.start ?? a.end + 0.4;
  // Into the gap if there is one, otherwise share the word's own time.
  const gap = nextStart - a.end;
  const added: Word =
    gap >= 0.15
      ? { id: newId(), text: text.trim(), start: a.end, end: Math.min(nextStart, a.end + 0.5) }
      : { id: newId(), text: text.trim(), start: (a.start + a.end) / 2, end: a.end };
  const head = gap >= 0.15 ? a : { ...a, end: (a.start + a.end) / 2 };
  return [...words.slice(0, i), head, added, ...words.slice(i + 1)];
}

/** Shifts a set of words in time, clamped so they never cross their neighbours. */
export function nudge(words: Word[], ids: Set<string>, delta: number): Word[] {
  const idx = words.map((w, i) => (ids.has(w.id) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return words;
  const first = idx[0];
  const last = idx.at(-1)!;
  const lo = (words[first - 1]?.end ?? 0) - words[first].start;
  const hi = (words[last + 1]?.start ?? Infinity) - words[last].end;
  const d = Math.min(hi, Math.max(lo, delta));
  return words.map((w) => (ids.has(w.id) ? { ...w, start: w.start + d, end: w.end + d } : w));
}

/** Whole-word, case-insensitive find and replace. Returns the count too. */
export function replaceAll(words: Word[], find: string, replace: string): { words: Word[]; count: number } {
  const needle = find.trim().toLowerCase();
  if (!needle) return { words, count: 0 };
  let count = 0;
  const strip = (s: string) => s.toLowerCase().replace(/[?!.,]+$/, "");
  const out = words.map((w) => {
    if (strip(w.text) !== needle) return w;
    count++;
    const tail = w.text.match(/[?!.,]+$/)?.[0] ?? "";
    return { ...w, text: replace.trim() + tail };
  });
  return { words: out.filter((w) => w.text.trim()), count };
}
