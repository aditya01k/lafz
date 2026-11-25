import { sliceWav } from "./wav";
import type { TimedWord } from "./whisper";

// Sarvam's REST endpoint takes at most 30 s of audio and times phrases, not words.
// So Whisper's words decide where to cut and when each word lands; Sarvam only
// supplies the Roman Hinglish text for each piece.
const MAX_PIECE = 25;
const PAD = 0.15;

type Piece = { words: TimedWord[]; start: number; end: number };

/** Cuts at the widest pause that keeps each piece under MAX_PIECE seconds. */
export function splitIntoPieces(words: TimedWord[]): Piece[] {
  const pieces: Piece[] = [];
  let i = 0;
  while (i < words.length) {
    const from = words[i].start;
    let j = i;
    while (j + 1 < words.length && words[j + 1].end - from <= MAX_PIECE) j++;
    // Prefer the biggest gap in the last third of the window as the cut.
    if (j + 1 < words.length) {
      let best = j;
      let bestGap = -1;
      for (let k = Math.max(i, Math.floor(i + (j - i) * 0.66)); k <= j; k++) {
        const gap = (words[k + 1]?.start ?? Infinity) - words[k].end;
        if (gap > bestGap) {
          bestGap = gap;
          best = k;
        }
      }
      j = best;
    }
    const slice = words.slice(i, j + 1);
    pieces.push({ words: slice, start: slice[0].start, end: slice.at(-1)!.end });
    i = j + 1;
  }
  return pieces;
}

async function sarvamText(wav: Uint8Array, key: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([wav as BlobPart], { type: "audio/wav" }), "piece.wav");
  form.append("model", "saaras:v4");
  form.append("mode", "translit");
  form.append("language_code", "hi-IN");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": key },
      body: form,
    });
    if (res.ok) return ((await res.json()) as { transcript?: string }).transcript ?? "";
    if ((res.status === 429 || res.status === 503) && attempt < 3) {
      await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
      continue;
    }
    throw new Error(`Sarvam failed: ${res.status} ${await res.text()}`);
  }
}

/**
 * Places n Sarvam words over the m Whisper words of the same piece. Each Sarvam
 * word gets a slice of Whisper's index space, and times are read off Whisper's
 * words at those fractional positions, so pauses between words survive.
 */
export function mapOntoTiming(texts: string[], timing: TimedWord[]): TimedWord[] {
  const n = texts.length;
  const m = timing.length;
  if (!n || !m) return [];
  if (n === m) return texts.map((text, i) => ({ text, start: timing[i].start, end: timing[i].end }));
  const at = (x: number, edge: "start" | "end") => {
    // x in [0, m]: integer part picks the word, fraction moves through it.
    const k = Math.min(m - 1, Math.floor(x));
    const f = x - k;
    const w = timing[k];
    if (edge === "start" && f === 0) return w.start;
    if (edge === "end" && x >= m) return timing[m - 1].end;
    return w.start + (w.end - w.start) * Math.min(1, f);
  };
  // Weight by length so long words get more time than "hai".
  const weights = texts.map((t) => Math.max(1, t.length));
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return texts.map((text, i) => {
    const a = (acc / total) * m;
    acc += weights[i];
    const b = (acc / total) * m;
    const start = at(a, "start");
    let end = at(b, "end");
    // Don't stretch a word across a pause: stop where its Whisper word stops.
    const k = Math.min(m - 1, Math.floor(a));
    const next = timing[k + 1];
    if (next && end > timing[k].end && next.start - timing[k].end > 0.2) end = timing[k].end;
    return { text, start, end: Math.max(start + 0.05, end) };
  });
}

export async function sarvamWords(wav: Uint8Array, timing: TimedWord[], key: string): Promise<TimedWord[]> {
  const pieces = splitIntoPieces(timing);
  const results = await Promise.all(
    pieces.map(async (p) => {
      const text = await sarvamText(sliceWav(wav, p.start - PAD, p.end + PAD), key);
      const tokens = text.split(/\s+/).filter(Boolean);
      // An empty answer for a piece Whisper heard keeps Whisper's words.
      return tokens.length ? mapOntoTiming(tokens, p.words) : p.words;
    }),
  );
  return results.flat();
}
