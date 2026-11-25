import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Language, Script } from "@/lib/languages";
import type { TimedWord } from "./whisper";

/**
 * Local mode (LAFZ_LOCAL=1): everything runs on the creator's own Mac, no API keys, no internet
 * after setup. Words and timing come from Whisper on Apple's MLX (mlx-whisper, run through uvx);
 * the spelling pass uses a model served by Ollama (see spelling.ts). Set up with
 * scripts/setup-local.sh.
 */
const run = promisify(execFile);

export const localMode = () => process.env.LAFZ_LOCAL === "1";

const WHISPER_MODEL = process.env.LAFZ_WHISPER_MODEL ?? "mlx-community/whisper-large-v3-turbo";

// Whisper's language codes. Odia isn't one of Whisper's languages: it falls back to auto-detect.
const CODES: Record<string, string | undefined> = {
  hindi: "hi", tamil: "ta", telugu: "te", kannada: "kn", malayalam: "ml", bengali: "bn",
  marathi: "mr", gujarati: "gu", punjabi: "pa", urdu: "ur", odia: undefined,
};

// Same nudge as the hosted path: for Hindi in English letters, Whisper writes Roman Hindi.
const HINGLISH_PROMPT =
  "Haan bhai, toh aaj hum Goa ja rahe hain. Yeh jagah ekdum mast hai, trust me. Chalo shuru karte hain!";

export async function localWords(wav: Uint8Array, language: Language, script: Script): Promise<TimedWord[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "lafz-"));
  try {
    const file = path.join(dir, "audio.wav");
    await writeFile(file, wav);
    const code = CODES[language.id];
    const args = [
      "--from", "mlx-whisper", "mlx_whisper", file,
      "--model", WHISPER_MODEL,
      "--word-timestamps", "True",
      "--output-format", "json",
      "--output-dir", dir,
      "--verbose", "False",
      ...(code ? ["--language", code] : []),
      ...(language.id === "hindi" && script === "latin" ? ["--initial-prompt", HINGLISH_PROMPT] : []),
    ];
    await run("uvx", args, { maxBuffer: 64 * 1024 * 1024, timeout: 10 * 60 * 1000 });
    const json = JSON.parse(await readFile(path.join(dir, "audio.json"), "utf8")) as {
      segments?: { words?: { word: string; start: number; end: number }[] }[];
    };
    return (json.segments ?? [])
      .flatMap((s) => s.words ?? [])
      .map((w) => ({ text: w.word.trim(), start: w.start, end: w.end }))
      .filter((w) => w.text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/ENOENT|uvx/.test(msg)) throw new Error("Local mode needs uv: run scripts/setup-local.sh");
    throw err;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
