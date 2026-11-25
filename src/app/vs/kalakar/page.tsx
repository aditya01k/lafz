import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import data from "@/data/benchmark.json";

/**
 * The public head-to-head. It only exists once real results are in src/data/benchmark.json
 * (from `pnpm benchmark`); until then the route is a 404, so nothing is claimed without data.
 */

type Score = { words: number; wer: number; looseWer: number };
type Results = {
  at: string | null;
  overall: Record<string, { reels: number; words: number; wer: number; looseWer: number }>;
  reels: { reel: string; language: string; scores: Record<string, Score> }[];
};

const results = data as Results;
const C = { paper: "#ece6dc", card: "#f6f2ea", ink: "#1d1714", soft: "#6f645c", line: "rgba(29,23,20,0.12)", maroon: "#3a1515" };
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const label = (t: string) => (t === "lafz" ? "lafz" : t.charAt(0).toUpperCase() + t.slice(1));

export const metadata: Metadata = {
  title: "lafz vs Kalakar: caption accuracy on real Indian reels",
  description: "Word error rate of lafz and Kalakar on the same reels, against transcripts checked by hand. Open method, open code.",
};

export default function Page() {
  if (!results.reels.length || !results.overall.lafz || !results.overall.kalakar) notFound();
  const tools = Object.keys(results.overall).sort((a) => (a === "lafz" ? -1 : 1));
  const words = results.overall.lafz.words;
  return (
    <main className="flex-1 px-4 py-20" style={{ background: C.paper, color: C.ink }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-[14px]" style={{ color: C.soft }}>← lafz</Link>
        <h1 className="mt-6 text-[44px] leading-[1.05] font-normal tracking-[-0.04em] sm:text-[64px]">
          lafz vs Kalakar, <span className="font-serif italic">word for word.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[17px] leading-relaxed" style={{ color: C.soft }}>
          The same {results.reels.length} reels ({words.toLocaleString("en-IN")} words) through both tools, scored against
          transcripts a person checked by hand. Lower is better. Tested {results.at}.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {tools.map((t) => (
            <div
              key={t}
              className="rounded-[24px] p-7"
              style={t === "lafz" ? { background: C.maroon, color: "#f6efe7" } : { background: C.card, border: `1px solid ${C.line}` }}
            >
              <div className="text-[13px] font-medium uppercase tracking-[0.12em] opacity-60">{label(t)}</div>
              <div className="mt-3 text-[56px] leading-none font-light tracking-[-0.05em]">{pct(results.overall[t].wer)}</div>
              <div className="mt-2 text-[14px] opacity-70">words wrong</div>
              <div className="mt-4 text-[14px] opacity-70">{pct(results.overall[t].looseWer)} ignoring spelling variants</div>
            </div>
          ))}
        </div>

        <div className="mt-12 overflow-hidden rounded-[24px] border" style={{ background: C.card, borderColor: C.line }}>
          <div className="grid grid-cols-[1.4fr_1fr_repeat(var(--n),1fr)] border-b px-5 py-3 text-[12px] font-medium uppercase tracking-[0.1em]" style={{ borderColor: C.line, color: C.soft, ["--n" as string]: tools.length }}>
            <span>Reel</span>
            <span>Language</span>
            {tools.map((t) => (
              <span key={t}>{label(t)}</span>
            ))}
          </div>
          {results.reels.map((r, i) => (
            <div
              key={r.reel}
              className="grid grid-cols-[1.4fr_1fr_repeat(var(--n),1fr)] px-5 py-3.5 text-[15px]"
              style={{ ...(i ? { borderTop: `1px solid ${C.line}` } : {}), ["--n" as string]: tools.length }}
            >
              <span className="truncate pr-3">{r.reel}</span>
              <span style={{ color: C.soft }}>{r.language}</span>
              {tools.map((t) => (
                <span key={t} className="tabular-nums">{r.scores[t] ? pct(r.scores[t].wer) : "—"}</span>
              ))}
            </div>
          ))}
        </div>

        <section className="mt-12 max-w-2xl space-y-4 text-[15px] leading-relaxed" style={{ color: C.soft }}>
          <h2 className="text-[22px] tracking-[-0.02em]" style={{ color: C.ink }}>How we tested</h2>
          <p>
            Each reel went through both tools with default settings. A person then typed the correct words. Word error rate
            counts every word a tool got wrong, added or left out, divided by the number of correct words.
          </p>
          <p>
            English-letter Hindi has no single spelling, so we also report a score that forgives variants that mean the same
            word (&ldquo;hain&rdquo; and &ldquo;hai&rdquo;, &ldquo;bahut&rdquo; and &ldquo;bohot&rdquo;). That one only
            counts words a tool actually misheard.
          </p>
          <p>
            The scoring script is open source:{" "}
            <a className="underline" href="https://github.com/aditya01k/lafz/blob/main/scripts/benchmark.mts">scripts/benchmark.mts</a>. Run it on
            your own reels.
          </p>
        </section>
      </div>
    </main>
  );
}
