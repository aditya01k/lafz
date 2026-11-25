import { clientIp, spend } from "@/server/limit";
import { sarvamWords } from "@/server/sarvam";
import { cleanSpelling } from "@/server/spelling";
import { wavDuration } from "@/server/wav";
import { whisperWords } from "@/server/whisper";
import type { TranscribeResult } from "@/lib/types";

export const maxDuration = 300;

// 16 kHz mono 16-bit = 32 KB/s, so this is a little over 5 minutes of speech.
const MAX_BYTES = 10.5 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) return Response.json({ error: "No audio" }, { status: 400 });
  if (audio.size > MAX_BYTES) {
    return Response.json({ error: "Videos can be up to 5 minutes long." }, { status: 413 });
  }
  const dictionary = String(form.get("dictionary") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);

  const wav = new Uint8Array(await audio.arrayBuffer());
  if (!spend(clientIp(req), wavDuration(wav))) {
    return Response.json(
      { error: "You've captioned 20 minutes in the last hour. Try again in a bit." },
      { status: 429 },
    );
  }
  try {
    const timing = await whisperWords(wav);
    const sarvamKey = process.env.SARVAM_API_KEY;
    const raw = sarvamKey ? await sarvamWords(wav, timing, sarvamKey) : timing;
    const cleaned = await cleanSpelling(raw, dictionary);
    const result: TranscribeResult = {
      engine: sarvamKey ? "sarvam+whisper" : "whisper",
      durationSec: wavDuration(wav),
      words: cleaned.map((w, i) => ({
        id: `w${i}`,
        text: w.text,
        start: round(w.start),
        end: round(w.end),
        emoji: w.emoji,
      })),
    };
    return Response.json(result);
  } catch (err) {
    console.error("transcribe failed", err);
    return Response.json({ error: "Transcription failed. Try again in a moment." }, { status: 502 });
  }
}

const round = (s: number) => Math.round(s * 1000) / 1000;
