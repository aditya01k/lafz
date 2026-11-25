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

// ---- Caption-level edits (the timeline and the captions panel) ----
// A caption is a run of words; it's addressed by its words' ids.

const ids = (line: { words: Word[] }) => new Set(line.words.map((w) => w.id));

/**
 * Hand edits fix where captions start, so one edit never re-flows the captions after it:
 * the given words each start a caption.
 */
function pin(words: Word[], ...starts: (string | undefined)[]): Word[] {
  const set = new Set(starts.filter(Boolean));
  if (!set.size) return words;
  return words.map((w, i) => (set.has(w.id) && i > 0 && !w.breakBefore ? { ...w, breakBefore: true, keepWithPrev: false } : w));
}
/** The word right after a caption. */
const after = (words: Word[], line: { words: Word[] }) => words[words.findIndex((w) => w.id === line.words.at(-1)!.id) + 1]?.id;

type Span = { words: Word[]; start: number; end: number };

/**
 * Moves a caption in time. Dragging it into a neighbour trims that neighbour's edge (like an
 * overwrite in Premiere), leaving it at least 0.2 s; it never jumps past one.
 */
export function moveCaption(words: Word[], line: Span, delta: number, prev?: Span, next?: Span): Word[] {
  const MIN = 0.2;
  let d = delta;
  d = Math.max(d, -line.start);
  if (prev) d = Math.max(d, prev.start + MIN - line.start);
  if (next) d = Math.min(d, next.end - MIN - line.end);
  if (Math.abs(d) < 1e-4) return words;
  let out = words;
  if (next && line.end + d > next.start) out = trimCaption(out, next, "in", line.end + d, true);
  if (prev && line.start + d < prev.end) out = trimCaption(out, prev, "out", line.start + d, true);
  const set = ids(line);
  const lastId = line.words.at(-1)!.id;
  const moved = out.map((w) =>
    set.has(w.id) ? { ...w, start: w.start + d, end: w.end + d, ...(w.id === lastId ? { outAt: line.end + d } : {}) } : w,
  );
  return pin(moved, prev?.words[0].id, line.words[0].id, next?.words[0].id, next && after(words, next));
}

/**
 * Sets a caption's in or out point. The words inside are re-spaced to fit, and the out point is
 * kept exactly (like trimming a clip in Premiere).
 */
export function trimCaption(words: Word[], line: Span, edge: "in" | "out", t: number, force = false): Word[] {
  const set = ids(line);
  const idx = words.map((w, i) => (set.has(w.id) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return words;
  const prevEnd = force ? 0 : (words[idx[0] - 1]?.outAt ?? words[idx[0] - 1]?.end ?? 0);
  const nextStart = force ? Infinity : (words[idx.at(-1)! + 1]?.start ?? Infinity);
  const newStart = edge === "in" ? Math.min(Math.max(t, prevEnd), line.end - 0.1) : line.start;
  const newEnd = edge === "out" ? Math.max(Math.min(t, nextStart), line.start + 0.1) : line.end;
  const oldStart = line.start;
  const oldSpan = Math.max(0.01, line.end - line.start);
  const k = (newEnd - newStart) / oldSpan;
  const map = (x: number) => newStart + (Math.min(x, line.end) - oldStart) * k;
  const lastId = line.words.at(-1)!.id;
  const out = words.map((w) =>
    set.has(w.id) ? { ...w, start: map(w.start), end: map(w.end), ...(w.id === lastId ? { outAt: newEnd } : { outAt: undefined }) } : w,
  );
  return pin(out, line.words[0].id, after(words, line));
}

/** Drags one edge of a caption; pulling it into a neighbour trims the neighbour (to 0.2 s at least). */
export function trimEdge(words: Word[], line: Span, edge: "in" | "out", t: number, prev?: Span, next?: Span): Word[] {
  const MIN = 0.2;
  if (edge === "out") {
    const end = Math.max(line.start + 0.1, next ? Math.min(t, next.end - MIN) : t);
    const out = next && end > next.start ? trimCaption(words, next, "in", end, true) : words;
    return pin(trimCaption(out, line, "out", end, true), line.words[0].id, next?.words[0].id, next && after(words, next));
  }
  const start = Math.min(line.end - 0.1, Math.max(0, prev ? Math.max(t, prev.start + MIN) : t));
  const out = prev && start < prev.end ? trimCaption(words, prev, "out", start, true) : words;
  return pin(trimCaption(out, line, "in", start, true), prev?.words[0].id, line.words[0].id, after(words, line));
}

/** Splits a caption in two at the word boundary nearest t (like the razor in Premiere). */
export function splitAt(words: Word[], line: Span, t: number): Word[] {
  const cut = line.words
    .slice(1)
    .reduce<Word | null>((best, w) => (!best || Math.abs(w.start - t) < Math.abs(best.start - t) ? w : best), null);
  if (!cut) return words;
  const i = words.findIndex((w) => w.id === cut.id);
  const out = words.map((w, j) => (j === i ? { ...w, keepWithPrev: false } : j === i - 1 ? { ...w, outAt: undefined } : w));
  return pin(out, line.words[0].id, cut.id, after(words, line));
}

/** Joins a caption with the one after it. */
export function mergeWithNext(words: Word[], line: { words: Word[] }, next: { words: Word[] }): Word[] {
  const lastId = line.words.at(-1)!.id;
  const nextIds = ids(next);
  const out = words.map((w) =>
    w.id === lastId ? { ...w, outAt: undefined } : nextIds.has(w.id) ? { ...w, breakBefore: false, keepWithPrev: true } : w,
  );
  return pin(out, line.words[0].id, after(words, next));
}

let seq2 = 0;
const nid = () => `c${Date.now().toString(36)}${(seq2++).toString(36)}`;

/** Words for a caption's text, spread over [start, end] by length, kept together as one caption. */
function spread(text: string, start: number, end: number, outAt?: number): Word[] {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  const total = parts.reduce((n, p) => n + p.length, 0) || 1;
  let t = start;
  return parts.map((p, i) => {
    const dur = ((end - start) * p.length) / total;
    const w: Word = { id: nid(), text: p, start: t, end: t + dur, breakBefore: i === 0, keepWithPrev: i > 0 };
    if (i === parts.length - 1 && outAt !== undefined) w.outAt = outAt;
    t += dur;
    return w;
  });
}

/** Rewrites a whole caption's text, keeping its timing. Empty text deletes it. */
export function setCaptionText(words: Word[], line: { words: Word[]; start: number; end: number }, text: string): Word[] {
  const set = ids(line);
  const first = words.findIndex((w) => set.has(w.id));
  if (first < 0) return words;
  const same = line.words.map((w) => w.text).join(" ");
  if (text.trim() === same) return words;
  const lastWordEnd = line.words.at(-1)!.end;
  const fresh = spread(text, line.start, lastWordEnd, line.words.at(-1)!.outAt);
  // Keep highlights on words that didn't change.
  for (const w of fresh) {
    const old = line.words.find((o) => o.text === w.text && o.emphasis);
    if (old) w.emphasis = true;
  }
  const rest = words.slice(first).filter((w) => !set.has(w.id));
  // The next caption still starts where it did, even if this one got shorter.
  if (rest[0]) rest[0] = { ...rest[0], breakBefore: true, keepWithPrev: false };
  return [...words.slice(0, first), ...fresh, ...rest];
}

export const deleteCaption = (words: Word[], line: { words: Word[] }) => {
  const set = ids(line);
  return pin(words, after(words, line)).filter((w) => !set.has(w.id));
};

/** Adds a caption at t (in the gap there, up to `dur` seconds). */
export function insertCaption(words: Word[], t: number, text: string, dur = 1.5): Word[] {
  const prev = words.filter((w) => w.start <= t).at(-1);
  // Only into a gap: never inside someone's caption.
  if (prev && (prev.outAt ?? prev.end + 0.3) > t) return words;
  const next = words.find((w) => w.start > t);
  const end = Math.min(t + dur, next?.start ?? t + dur);
  if (end - t < 0.2) return words;
  const fresh = spread(text, t, end, end);
  const i = next ? words.indexOf(next) : words.length;
  const out = [...words.slice(0, i), ...fresh, ...words.slice(i)];
  if (next) out[i + fresh.length] = { ...next, breakBefore: true, keepWithPrev: false };
  return out;
}

/** Captions from an SRT/VTT file replace the transcript. */
export function fromCues(cues: { start: number; end: number; text: string }[]): Word[] {
  return cues.flatMap((c) => spread(c.text, c.start, c.end, c.end));
}

// ---- Bulk edits ----

/** Moves every caption (or just these) by delta seconds: the fix for audio that's out of sync. */
export function shiftWords(words: Word[], delta: number, only?: Set<string>): Word[] {
  const pick = (w: Word) => !only || only.has(w.id);
  const first = words.find(pick);
  if (!first) return words;
  const d = Math.max(delta, -first.start);
  return words.map((w) => (pick(w) ? { ...w, start: w.start + d, end: w.end + d, ...(w.outAt !== undefined ? { outAt: w.outAt + d } : {}) } : w));
}

export function deleteCaptions(words: Word[], lines: Span[]): Word[] {
  if (!lines.length) return words;
  const gone = new Set(lines.flatMap((l) => l.words.map((w) => w.id)));
  return pin(words, after(words, lines.at(-1)!)).filter((w) => !gone.has(w.id));
}

/** Joins a run of neighbouring captions into one. */
export function mergeCaptions(words: Word[], lines: Span[]): Word[] {
  if (lines.length < 2) return words;
  const lastIds = new Set(lines.slice(0, -1).map((l) => l.words.at(-1)!.id));
  const rest = new Set(lines.slice(1).flatMap((l) => l.words.map((w) => w.id)));
  const out = words.map((w) => {
    let x = w;
    if (lastIds.has(w.id)) x = { ...x, outAt: undefined };
    if (rest.has(w.id)) x = { ...x, breakBefore: false, keepWithPrev: true };
    return x;
  });
  return pin(out, lines[0].words[0].id, after(words, lines.at(-1)!));
}

/** Closes gaps shorter than maxGap by holding each caption until the next one (less flicker). */
export function closeGaps(words: Word[], lines: Span[], maxGap: number, keep = 0): Word[] {
  let out = words;
  lines.forEach((l, i) => {
    const next = lines[i + 1];
    if (!next) return;
    const gap = next.start - l.end;
    if (gap > keep + 0.0005 && gap <= maxGap) out = trimCaption(out, l, "out", next.start - keep, true);
  });
  return out;
}
