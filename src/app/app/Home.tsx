"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LANGUAGES, languageById, type Script } from "@/lib/languages";
import { minutesLabel, RUPEES_PER_MINUTE } from "@/lib/pricing";
import { AccountButton, useAccount } from "../Account";

/**
 * The product dashboard's home: your minutes, a new video, and the videos you've captioned on
 * this device. The marketing page never shows any of this.
 */

export type Recent = { key: string; name: string; duration: number; language?: string; script?: Script; at: number };

const RECENT_KEY = "lafz:recent";

export function readRecent(): Recent[] {
  try {
    return (JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as Recent[]).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

export function rememberRecent(r: Recent) {
  try {
    const list = readRecent().filter((x) => x.key !== r.key);
    localStorage.setItem(RECENT_KEY, JSON.stringify([r, ...list].slice(0, 30)));
  } catch {}
}

type OnFile = (f: File, opts: { dictionary: string; language: string; script: Script }) => void;

const STEPS = ["Reading the audio", "Listening to every word", "Fixing the spellings"];

type Mode = "simple" | "pro";

function readMode(): Mode {
  try {
    return JSON.parse(localStorage.getItem("lafz:mode") ?? '"pro"') === "simple" ? "simple" : "pro";
  } catch {
    return "pro";
  }
}

export default function Home({
  onFile,
  onSample,
  error,
  working,
}: {
  onFile: OnFile;
  onSample: () => void;
  error?: string;
  working?: { step: number; name: string };
}) {
  const { me, openBuy } = useAccount();
  const [recent, setRecent] = useState<Recent[]>([]);
  const [mode, setModeRaw] = useState<Mode>("pro");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setRecent(readRecent());
    setModeRaw(readMode());
  }, []);
  const setMode = (m: Mode) => {
    setModeRaw(m);
    try {
      localStorage.setItem("lafz:mode", JSON.stringify(m));
    } catch {}
  };
  const hosted = me?.billing && me.user;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-4">
        <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-tight">
          <img src="/logo-mark.svg" alt="" className="size-6 rounded-[6px]" />
          lafz
        </Link>
        <span className="flex-1" />
        {hosted && (
          <button onClick={() => openBuy()} className="h-8 rounded-full px-3 text-[13px] text-muted hover:text-foreground">
            Add credits
          </button>
        )}
        <AccountButton />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">{working ? "Captioning…" : "New video"}</h1>
        <p className="mt-1 text-[14px] text-muted">
          {hosted ? (
            <>
              Caption and edit for free. You pay ₹{RUPEES_PER_MINUTE} a minute only when you export
              {(me.seconds ?? 0) > 0 ? <> · {minutesLabel(me.seconds ?? 0)} of credit left</> : null}.
            </>
          ) : me?.local ? (
            "Running on this Mac, offline."
          ) : (
            "Drop a reel to caption it."
          )}
        </p>

        {!working && (
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["pro", "Pro editor", "Timeline, frame timecode, quality checks, exports for Premiere and Resolve"],
                ["simple", "Simple", "Pick one of 12 looks, set size and place, export"],
              ] as const
            ).map(([m, title, body]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-2xl border p-4 text-left transition ${mode === m ? "border-accent bg-accent/10" : "border-hairline bg-surface hover:border-white/20"}`}
              >
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  <span className={`size-3.5 rounded-full border-2 ${mode === m ? "border-accent bg-accent" : "border-white/30"}`} />
                  {title}
                </span>
                <span className="mt-1 block pl-[22px] text-[13px] text-muted">{body}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-hairline bg-surface p-6">
          {working ? <Progress {...working} /> : <Dropzone onFile={onFile} error={error} />}
        </div>
        {!working && (
          <button onClick={onSample} className="mt-4 flex w-full items-center justify-between rounded-2xl border border-hairline px-5 py-4 text-left hover:border-white/20">
            <span>
              <span className="block text-[15px] font-medium">No video handy? Try the editor on a sample reel</span>
              <span className="block text-[13px] text-muted">Already captioned, free to edit and export.</span>
            </span>
            <span className="text-[18px] text-muted">→</span>
          </button>
        )}

        {recent.length > 0 && !working && (
          <section className="mt-12">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.1em] text-muted">Recent on this device</h2>
            <p className="mt-1 text-[12px] text-muted">Your edits are saved here. Choose the same video again to pick up where you left off, at no charge.</p>
            <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline">
              {recent.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-4 bg-surface px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium">{r.name}</div>
                    <div className="text-[12px] text-muted">
                      {minutesLabel(r.duration)} · {r.language ? languageById(r.language).name : "Hindi"}
                      {r.script === "native" ? " script" : ""} · {new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function Dropzone({ onFile, error }: { onFile: OnFile; error?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [dictionary, setDictionary] = useState("");
  const [language, setLanguage] = useState("hindi");
  const [script, setScript] = useState<Script>("latin");
  const lang = languageById(language);
  const pick = (f?: File | null) => {
    if (f && (f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name))) onFile(f, { dictionary, language, script });
  };
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-12 transition ${
          drag ? "border-accent bg-accent/10" : "border-white/15 bg-black/30 hover:border-white/30"
        }`}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-ink">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
          </svg>
        </span>
        <span className="mt-4 text-[16px] font-medium">Drop a video or click to browse</span>
        <span className="mt-1 text-[13px] text-muted">MP4 or MOV, up to 5 min. The video stays on your device.</span>
      </button>
      <input ref={input} type="file" accept="video/*,.mov,.mp4" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="mt-5 grid gap-3 text-[13px] sm:grid-cols-[1fr_1.4fr]">
        <label className="block">
          <span className="text-muted">Language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-black px-3 outline-none">
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="text-muted">Write in</span>
          <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl border border-hairline bg-black p-1">
            {(["latin", "native"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScript(s)}
                className={`rounded-lg px-2.5 py-1.5 text-left transition ${script === s ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`}
              >
                <span className="block text-[12px] font-medium">{s === "latin" ? "English letters" : lang.scriptName}</span>
                <span className="block truncate text-[12px] opacity-75">{s === "latin" ? lang.latinSample : lang.nativeSample}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <input
        value={dictionary}
        onChange={(e) => setDictionary(e.target.value)}
        placeholder="Names and brands to spell right, e.g. Zostel, PhonePe (optional)"
        className="mt-3 h-11 w-full rounded-xl border border-hairline bg-black px-3 text-[13px] outline-none placeholder:text-muted/60"
      />
      {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">{error}</p>}
    </div>
  );
}

function Progress({ step, name }: { step: number; name: string }) {
  return (
    <div className="py-2">
      <div className="truncate text-[15px] font-medium">{name}</div>
      <ol className="mt-5 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-[15px]">
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                i < step ? "bg-accent text-accent-ink" : i === step ? "animate-pulse border-2 border-accent" : "border border-white/20"
              }`}
            >
              {i < step ? "✓" : ""}
            </span>
            <span className={i > step ? "text-muted" : ""}>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[13px] text-muted">A 1-minute reel takes about 20 seconds.</p>
    </div>
  );
}
