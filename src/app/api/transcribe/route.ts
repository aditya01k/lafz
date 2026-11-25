import { languageById, type Script } from "@/lib/languages";
import type { TranscribeResult } from "@/lib/types";
import { billingOn, currentUser } from "@/server/auth";
import { balance, charge, refundCharge, settleCharge } from "@/server/credits";
import { clientIp, endJob, spend, startJob } from "@/server/limit";
import { sarvamWords } from "@/server/sarvam";
import { cleanSpelling } from "@/server/spelling";
import { isOurWav, wavDuration } from "@/server/wav";
import { whisperWords } from "@/server/whisper";

export const maxDuration = 300;

// 16 kHz mono 16-bit = 32 KB/s, so this is a little over 5 minutes of speech.
const MAX_BYTES = 10.5 * 1024 * 1024;

export async function POST(req: Request) {
  // Refuse oversized bodies before reading them (formData() buffers the whole upload).
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (!declared || declared > MAX_BYTES + 64 * 1024) {
    return Response.json({ error: "Videos can be up to 5 minutes long." }, { status: 413 });
  }
  // Hosted: who's asking, before reading a single byte of the upload.
  const user = billingOn() ? await currentUser() : null;
  if (billingOn() && !user) return Response.json({ error: "Sign in to caption on lafz.", code: "signin" }, { status: 401 });

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) return Response.json({ error: "No audio" }, { status: 400 });
  if (audio.size > MAX_BYTES) return Response.json({ error: "Videos can be up to 5 minutes long." }, { status: 413 });
  // Up to 50 names, 40 characters each: they go into every spelling request.
  const dictionary = String(form.get("dictionary") ?? "")
    .slice(0, 2000)
    .split(",")
    .map((s) => s.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 50);
  const language = languageById(String(form.get("language") ?? "hindi"));
  const script: Script = form.get("script") === "native" ? "native" : "latin";
  const wav = new Uint8Array(await audio.arrayBuffer());
  if (!isOurWav(wav)) return Response.json({ error: "Unsupported audio. Please upload the video again." }, { status: 400 });
  const duration = wavDuration(wav);
  const seconds = Math.max(1, Math.ceil(duration));

  // One job at a time per user (or IP), and at most 60 minutes of audio an hour.
  const who = user?.id ?? clientIp(req);
  if (!startJob(who)) return Response.json({ error: "Another video is still being captioned. Try again when it's done." }, { status: 429 });
  try {
    // The hourly cap protects hosted and public copies; a self-hoster on their own machine has none.
    if ((billingOn() || process.env.NODE_ENV === "production") && !spend(who, seconds)) {
      return Response.json({ error: "That's an hour of captioning in the last hour. Try again in a bit." }, { status: 429 });
    }

    // Hosted: the minutes are taken up front, settled on success, given back on failure.
    let paid: { userId: string; ref: string } | null = null;
    if (user) {
      const ref = await charge(user.id, seconds, `${language.name} (${script}), ${seconds}s`);
      if (!ref) {
        return Response.json(
          { error: "Not enough credits for this video.", code: "credits", needed: seconds, seconds: await balance(user.id) },
          { status: 402 },
        );
      }
      paid = { userId: user.id, ref };
    }
    return await transcribe(wav, duration, dictionary, language, script, paid);
  } finally {
    endJob(who);
  }
}

async function transcribe(
  wav: Uint8Array,
  duration: number,
  dictionary: string[],
  language: ReturnType<typeof languageById>,
  script: Script,
  paid: { userId: string; ref: string } | null,
) {
  try {
    // Words past the real end of the audio can't be right: drop them.
    const timing = (await whisperWords(wav, language, script)).filter((w) => w.start < duration + 0.5);
    const sarvamKey = process.env.SARVAM_API_KEY;
    const raw = sarvamKey ? await sarvamWords(wav, timing, sarvamKey, language, script) : timing;
    const cleaned = await cleanSpelling(raw, dictionary, language, script);
    const result: TranscribeResult = {
      engine: sarvamKey ? "sarvam+whisper" : "whisper",
      durationSec: duration,
      words: cleaned.map((w, i) => ({ id: `w${i}`, text: w.text, start: round(w.start), end: round(w.end), emoji: w.emoji })),
      ...(paid ? { seconds: await balance(paid.userId) } : {}),
    };
    if (paid) await settleCharge(paid.ref);
    return Response.json(result);
  } catch (err) {
    console.error("transcribe failed", err);
    if (paid) await refundCharge(paid.userId, paid.ref).catch((e) => console.error("refund failed", e));
    return Response.json({ error: "Transcription failed. Your credits weren't used. Try again in a moment." }, { status: 502 });
  }
}

const round = (s: number) => Math.round(s * 1000) / 1000;
