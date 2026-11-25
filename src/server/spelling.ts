import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { TimedWord } from "./whisper";

let client: OpenAI | undefined;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.5";
const BATCH = 250;

const Out = z.object({
  words: z.array(
    z.object({
      text: z.string().describe("The word in Roman Hinglish, or \"\" to drop a duplicate or noise token."),
      emoji: z.string().describe("One emoji that fits this word, or \"\". Use sparingly: about one per sentence."),
    }),
  ),
});

const PROMPT = `You clean up auto-transcribed Hinglish (Hindi-English) speech for video captions.
You get a numbered list of words. Return exactly one entry per input word, in the same order.

For each word:
- Write Hindi/Urdu words in Roman script the way Indian creators type on Instagram and WhatsApp:
  "hai", "nahi", "kya", "bhai", "yaar", "accha", "matlab", "bahut", "kyunki", "wahan", "chahiye", "mein", "hum", "toh".
- Convert any Devanagari or Urdu script word to that Roman spelling.
- Keep English words in normal English spelling ("trip", "budget", "honestly", "actually").
- Fix obvious mishearings using context (an English word Whisper forced onto a Hindi word, or the reverse).
- Keep brand and place names correctly capitalised (Goa, Manali, PhonePe, IndiGo, Zomato).
- Keep numbers as digits when spoken as numbers ("5000", "2 din").
- Drop punctuation except "?" and "!" at the end of a question or exclamation, and apostrophes inside words.
- Use lowercase except names, "I", and the first word after a full stop.
- Never translate. Never merge or split words: one input word, one output entry.
Return "" for a word only if it is a stutter duplicate or a non-speech token.`;

/** One word in, one word out, so the timings stay attached to the right word. */
export async function cleanSpelling(
  words: TimedWord[],
  dictionary: string[],
): Promise<(TimedWord & { emoji?: string })[]> {
  if (!words.length) return [];
  client ??= new OpenAI();
  const out: (TimedWord & { emoji?: string })[] = [];
  for (let i = 0; i < words.length; i += BATCH) {
    const batch = words.slice(i, i + BATCH);
    out.push(...(await cleanBatch(batch, dictionary)));
  }
  return out.filter((w) => w.text);
}

async function cleanBatch(batch: TimedWord[], dictionary: string[]) {
  const dict = dictionary.length
    ? `\n\nThe creator's own spellings, always use these exactly: ${dictionary.join(", ")}`
    : "";
  try {
    const response = await client!.responses.parse({
      model: MODEL,
      reasoning: { effort: "low" },
      instructions: PROMPT + dict,
      input: batch.map((w, i) => `${i + 1}. ${w.text}`).join("\n"),
      text: { format: zodTextFormat(Out, "hinglish_words") },
    });
    const parsed = response.output_parsed?.words;
    // A wrong count would shift every timing after the mismatch: keep the raw words instead.
    if (!parsed || parsed.length !== batch.length) return batch;
    return batch.map((w, i) => ({
      ...w,
      text: parsed[i].text.trim(),
      emoji: parsed[i].emoji.trim() || undefined,
    }));
  } catch (err) {
    console.error("spelling pass failed, keeping raw words", err);
    return batch;
  }
}
