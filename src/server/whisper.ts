import type { Language, Script } from "@/lib/languages";

export type TimedWord = { text: string; start: number; end: number };

// A Hindi-in-English-letters prompt nudges Whisper to write Hindi in Latin script
// instead of Devanagari or Urdu; the spelling pass cleans up what's left.
const PROMPT =
  "Haan bhai, toh aaj hum Goa ja rahe hain. Yeh jagah ekdum mast hai, trust me. Chalo shuru karte hain!";

/** Whisper is the timing source: it's the only hosted engine here with per-word timestamps. */
export async function whisperWords(wav: Uint8Array, language: Language, script: Script): Promise<TimedWord[]> {
  // Groq's whisper-large-v3-turbo when keyed: same word timestamps at about a tenth of
  // whisper-1's price ($0.04 vs $0.36 an audio hour), and it's the biggest cost we control.
  const groq = process.env.GROQ_API_KEY;
  const key = groq ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Set GROQ_API_KEY or OPENAI_API_KEY");
  const url = groq ? "https://api.groq.com/openai/v1/audio/transcriptions" : "https://api.openai.com/v1/audio/transcriptions";
  const form = new FormData();
  form.append("file", new Blob([wav as BlobPart], { type: "audio/wav" }), "audio.wav");
  form.append("model", groq ? "whisper-large-v3-turbo" : "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  // The English-letters Hindi prompt only helps that case; otherwise Sarvam writes the text.
  if (language.id === "hindi" && script === "latin") form.append("prompt", PROMPT);
  const res = await fetch(url, {
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
