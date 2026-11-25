import type { Language } from "@/lib/languages";

export type TimedWord = { text: string; start: number; end: number };

// A Roman Hinglish prompt nudges Whisper to write Hindi in Latin script
// instead of Devanagari or Urdu; the spelling pass cleans up what's left.
const PROMPT =
  "Haan bhai, toh aaj hum Goa ja rahe hain. Yeh jagah ekdum mast hai, trust me. Chalo shuru karte hain!";

/** Whisper is the timing source: it's the only hosted engine here with per-word timestamps. */
export async function whisperWords(wav: Uint8Array, language: Language): Promise<TimedWord[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const form = new FormData();
  form.append("file", new Blob([wav as BlobPart], { type: "audio/wav" }), "audio.wav");
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  // The Roman Hinglish prompt only helps Hindi; for other languages Sarvam writes the text.
  if (language.sarvam === "hi-IN" && language.script === "roman") form.append("prompt", PROMPT);
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { words?: { word: string; start: number; end: number }[] };
  return (json.words ?? [])
    .map((w) => ({ text: w.word.trim(), start: w.start, end: w.end }))
    .filter((w) => w.text);
}
