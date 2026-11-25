/**
 * Caption accuracy benchmark: how many words each tool gets wrong, against a transcript a
 * person checked by hand.
 *
 * Put files in benchmark/, one set per reel, named by the reel:
 *   goa-vlog.mp4              the reel (only needed with --run)
 *   goa-vlog.reference.txt    the correct words, typed or fixed by a person
 *   goa-vlog.kalakar.srt      Kalakar's export (SRT or plain text), and any other tool the same way
 *   goa-vlog.lafz.txt         lafz's words (written by --run, or exported from the editor)
 *   goa-vlog.lang             optional, e.g. "hindi latin" (default) or "tamil native"
 *
 *   pnpm benchmark                          score what's there
 *   pnpm benchmark --run http://localhost:3300   first caption each reel with a running lafz
 *
 * Two scores per tool:
 *   WER        word error rate, exact words (after lowercasing and dropping punctuation)
 *   loose WER  the same, forgiving spelling variants that mean the same word in English
 *              letters ("hain"/"hai", "bahut"/"bohot", "accha"/"acha"), so a tool isn't
 *              penalised for a spelling choice, only for hearing the wrong word
 * Writes benchmark/results.json, which the /vs/kalakar page reads once copied to src/data/.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve("benchmark");
const runAt = process.argv.includes("--run") ? process.argv[process.argv.indexOf("--run") + 1] : null;

const words = (text: string) =>
  text
    .replace(/^\d+\s*$/gm, "") // SRT cue numbers
    .replace(/^\d\d:\d\d:\d\d[,.]\d+\s*-->\s*\d\d:\d\d:\d\d[,.]\d+.*$/gm, "") // SRT/VTT timings
    .replace(/^WEBVTT.*$/m, "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

/** A spelling-tolerant key for words in English letters; native-script words pass through. */
function loose(w: string): string {
  if (!/^[a-z0-9']+$/.test(w)) return w;
  return w
    .replace(/'/g, "")
    .replace(/aa/g, "a").replace(/ee/g, "i").replace(/oo/g, "u").replace(/ou/g, "o")
    .replace(/w/g, "v").replace(/z/g, "j").replace(/q/g, "k").replace(/ph/g, "f")
    .replace(/([bcdgjkpt])h/g, "$1")
    .replace(/([aeiou])h$/, "$1")
    .replace(/(.)\1+/g, "$1")
    .replace(/(ai|ae|e)n$/, "ai").replace(/an$/, "a")
    .replace(/[aeiou]+$/, (v) => v[0]);
}

/** Word-level edit distance (substitutions + insertions + deletions). */
function edits(ref: string[], hyp: string[]): number {
  let prev = Array.from({ length: hyp.length + 1 }, (_, j) => j);
  for (let i = 1; i <= ref.length; i++) {
    const cur = [i];
    for (let j = 1; j <= hyp.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[hyp.length];
}

async function caption(reel: string, mp4: string, lang: string[]) {
  const wav = path.join(DIR, `${reel}.wav`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", mp4, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", wav]);
  const form = new FormData();
  form.append("audio", new Blob([readFileSync(wav)], { type: "audio/wav" }), "audio.wav");
  form.append("language", lang[0] ?? "hindi");
  form.append("script", lang[1] ?? "latin");
  const res = await fetch(`${runAt!.replace(/\/$/, "")}/api/transcribe`, { method: "POST", body: form });
  const json = (await res.json()) as { words?: { text: string }[]; error?: string };
  if (!json.words) throw new Error(`${reel}: ${json.error ?? res.status}`);
  writeFileSync(path.join(DIR, `${reel}.lafz.txt`), json.words.map((w) => w.text).join(" ") + "\n");
}

const files = existsSync(DIR) ? readdirSync(DIR) : [];
const reels = [...new Set(files.filter((f) => f.endsWith(".reference.txt")).map((f) => f.replace(".reference.txt", "")))];
if (!reels.length) {
  console.log("No benchmark/<reel>.reference.txt files yet. See the comment at the top of this script.");
  process.exit(0);
}

type Score = { words: number; wer: number; looseWer: number };
const results: { reel: string; language: string; scores: Record<string, Score> }[] = [];

for (const reel of reels) {
  const lang = existsSync(path.join(DIR, `${reel}.lang`)) ? readFileSync(path.join(DIR, `${reel}.lang`), "utf8").trim().split(/\s+/) : ["hindi", "latin"];
  const mp4 = files.find((f) => f.startsWith(`${reel}.`) && /\.(mp4|mov)$/i.test(f));
  if (runAt && mp4) await caption(reel, path.join(DIR, mp4), lang);
  const ref = words(readFileSync(path.join(DIR, `${reel}.reference.txt`), "utf8"));
  const scores: Record<string, Score> = {};
  for (const f of readdirSync(DIR)) {
    const m = f.match(new RegExp(`^${reel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.([a-z0-9-]+)\\.(srt|vtt|txt)$`, "i"));
    if (!m || m[1] === "reference") continue;
    const hyp = words(readFileSync(path.join(DIR, f), "utf8"));
    scores[m[1]] = {
      words: ref.length,
      wer: edits(ref, hyp) / ref.length,
      looseWer: edits(ref.map(loose), hyp.map(loose)) / ref.length,
    };
  }
  results.push({ reel, language: lang.join(" "), scores });
}

// Overall: total errors over total reference words, per tool, across reels that tool covered.
const tools = [...new Set(results.flatMap((r) => Object.keys(r.scores)))];
const overall = Object.fromEntries(
  tools.map((t) => {
    const covered = results.filter((r) => r.scores[t]);
    const n = covered.reduce((s, r) => s + r.scores[t].words, 0);
    return [t, {
      reels: covered.length,
      words: n,
      wer: covered.reduce((s, r) => s + r.scores[t].wer * r.scores[t].words, 0) / n,
      looseWer: covered.reduce((s, r) => s + r.scores[t].looseWer * r.scores[t].words, 0) / n,
    }];
  }),
);

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
console.log("\nreel".padEnd(26) + tools.map((t) => `${t} WER / loose`.padEnd(24)).join(""));
for (const r of results) {
  console.log(r.reel.padEnd(25) + tools.map((t) => (r.scores[t] ? `${pct(r.scores[t].wer)} / ${pct(r.scores[t].looseWer)}` : "—").padEnd(24)).join(""));
}
console.log("OVERALL".padEnd(25) + tools.map((t) => `${pct(overall[t].wer)} / ${pct(overall[t].looseWer)}`.padEnd(24)).join(""));

writeFileSync(path.join(DIR, "results.json"), JSON.stringify({ at: new Date().toISOString().slice(0, 10), overall, reels: results }, null, 2) + "\n");
console.log(`\nWrote benchmark/results.json. Copy it to src/data/benchmark.json to publish /vs/kalakar.`);
