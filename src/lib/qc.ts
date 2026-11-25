import type { Line } from "./lines";

/**
 * Caption quality checks, the ones broadcast and streaming style guides use: reading speed,
 * flash frames, captions that overstay, lines over the character limit, and flicker gaps.
 */

export type Issue = { kind: "cps" | "short" | "long" | "chars" | "flicker"; label: string; detail: string };

export type QcRules = { maxCps: number; minDuration: number; maxDuration: number; maxChars: number; fps: number };

export const DEFAULT_QC: QcRules = { maxCps: 20, minDuration: 0.5, maxDuration: 7, maxChars: 42, fps: 30 };

const text = (l: Line) => l.words.map((w) => w.text).join(" ");

export function checkLine(l: Line, next: Line | undefined, r: QcRules): Issue[] {
  const out: Issue[] = [];
  const dur = l.end - l.start;
  const chars = text(l).replace(/\s+/g, " ").length;
  const cps = chars / Math.max(dur, 0.01);
  if (cps > r.maxCps) out.push({ kind: "cps", label: `${Math.round(cps)} cps`, detail: `Reads at ${cps.toFixed(1)} characters a second; over ${r.maxCps} is hard to follow. Lengthen it or cut words.` });
  if (dur < r.minDuration) out.push({ kind: "short", label: "Too short", detail: `On screen ${dur.toFixed(2)} s; under ${r.minDuration.toFixed(2)} s it flashes by.` });
  if (dur > r.maxDuration) out.push({ kind: "long", label: "Too long", detail: `On screen ${dur.toFixed(1)} s; over ${r.maxDuration} s, split it.` });
  if (chars > r.maxChars) out.push({ kind: "chars", label: `${chars} chars`, detail: `Over the ${r.maxChars}-character limit.` });
  if (next) {
    const gap = next.start - l.end;
    if (gap > 0.0005 && gap < 2 / r.fps) out.push({ kind: "flicker", label: "Flicker gap", detail: `Only ${Math.round(gap * r.fps)} frame gap before the next caption; close it or make it 2+ frames.` });
  }
  return out;
}

export const checkAll = (lines: Line[], r: QcRules) => lines.map((l, i) => checkLine(l, lines[i + 1], r));
