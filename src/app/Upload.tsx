"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES, languageById, type Script } from "@/lib/languages";
import { PACKS, RUPEES_PER_MINUTE } from "@/lib/pricing";
import { AccountButton } from "./Account";
import { HeroDemo, Playground } from "./demo";

/**
 * The landing page. Warm editorial look (cream paper, deep maroon, thin display type with an
 * italic serif accent). The editor stays dark; this page sells it. "Open source, free on your
 * own machine" is the first thing said and is repeated in every section that talks price.
 */

const STEPS = ["Reading the audio", "Listening to every word", "Fixing the spellings"];
const GITHUB = "https://github.com/aditya01k/lafz";
const CLONE = "git clone https://github.com/aditya01k/lafz";

// The page's own palette, kept here so the editor's dark theme is untouched.
const C = {
  paper: "#ece6dc",
  card: "#f6f2ea",
  ink: "#1d1714",
  soft: "#6f645c",
  line: "rgba(29,23,20,0.12)",
  maroon: "#3a1515",
  maroonSoft: "#5a2626",
};

type OnFile = (f: File, opts: { dictionary: string; language: string; script: Script }) => void;

export default function Upload({ onFile, error, working }: { onFile: OnFile; error?: string; working?: { step: number; name: string } }) {
  const pickRef = useRef<() => void>(() => {});
  const start = () => {
    document.getElementById("try")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => pickRef.current(), 450);
  };
  return (
    <div className="flex-1" style={{ background: C.paper, color: C.ink }}>
      <Nav onStart={start} />
      <main>
        <Hero onStart={start} />
        <Statement />

        <section id="try" className="px-4 pb-24">
          <div className="mx-auto max-w-3xl rounded-[28px] border p-6 sm:p-10" style={{ background: C.card, borderColor: C.line }}>
            {working ? <Progress {...working} /> : <Dropzone onFile={onFile} error={error} pickRef={pickRef} />}
          </div>
        </section>

        <section id="styles" className="border-t px-4 py-24" style={{ borderColor: C.line }}>
          <div className="mx-auto max-w-6xl">
            <Head kicker="Styles" title={<>Type a line. <Em>See it</Em> in every style.</>} sub="Four looks to start from, 30 trending fonts, or upload your own. Every colour, outline, highlight and animation is yours to change." />
            <div className="mt-12">
              <Playground />
            </div>
          </div>
        </section>

        <Compare />
        <Languages />
        <OnYourMac />
        <OpenSource />
        <Pricing onStart={start} />
      </main>
      <footer className="border-t px-4" style={{ borderColor: C.line }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 py-10 text-[13px]" style={{ color: C.soft }}>
          <span className="flex items-center gap-2">
            <Logo /> Open source captions, made in India
          </span>
          <span className="flex gap-5">
            <a href={GITHUB} className="hover:underline">GitHub</a>
            <span>AGPL-3.0</span>
            <span>Free to self-host</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

const Em = ({ children }: { children: React.ReactNode }) => <span className="font-serif font-normal italic">{children}</span>;

function Logo() {
  return (
    <span className="flex items-center gap-1.5 text-[17px] font-semibold tracking-tight" style={{ color: C.ink }}>
      <img src="/logo-mark.svg" alt="" className="size-6 rounded-[6px]" />
      lafz
    </span>
  );
}

function Nav({ onStart }: { onStart: () => void }) {
  return (
    <header className="sticky top-0 z-30 px-4 pt-4">
      <div
        className="mx-auto flex h-14 max-w-6xl items-center gap-6 rounded-2xl border px-4 backdrop-blur-xl"
        style={{ background: "rgba(246,242,234,0.8)", borderColor: C.line }}
      >
        <Logo />
        <nav className="hidden gap-6 text-[14px] md:flex" style={{ color: C.soft }}>
          <a href="#styles" className="hover:text-black">Styles</a>
          <a href="#languages" className="hover:text-black">Languages</a>
          <a href="#mac" className="hover:text-black">Run on Mac</a>
          <a href="#open-source" className="hover:text-black">Open source</a>
          <a href="#pricing" className="hover:text-black">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block [&_button]:!border-black/15 [&_button]:!text-[#1d1714] [&_.text-muted]:!text-[#6f645c]">
            <AccountButton />
          </div>
          <a href={GITHUB} className="flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium" style={{ borderColor: C.line, background: "#fff" }}>
            <GitHubIcon className="size-4" />
            <span className="hidden sm:inline">Star</span>
          </a>
          <button onClick={onStart} className="h-9 rounded-xl px-4 text-[13px] font-medium text-white" style={{ background: C.maroon }}>
            Caption a reel
          </button>
        </div>
      </div>
    </header>
  );
}

/** Thin circuit lines behind the hero, like a schematic of the pipeline. */
function Circuit() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <g fill="none" stroke={C.ink} strokeOpacity="0.1" strokeWidth="1">
        <path d="M0 220 H180 V120 H360 V60" />
        <path d="M0 520 H120 V420 H280 V340 H400" />
        <path d="M1200 180 H1020 V300 H860 V380" />
        <path d="M1200 560 H1060 V460 H900" />
        <path d="M120 800 V680 H330 V600" />
        <path d="M1080 800 V700 H860 V640" />
      </g>
      <g fill={C.card} stroke={C.ink} strokeOpacity="0.15">
        {[[180, 120], [280, 340], [1020, 300], [1060, 460], [330, 680], [860, 700]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x - 7} y={y - 7} width="14" height="14" rx="3" />
        ))}
      </g>
    </svg>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-10 sm:pt-24">
      <Circuit />
      <div className="relative mx-auto max-w-4xl text-center">
        <a
          href="#open-source"
          className="inline-flex items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 text-[13px] font-medium shadow-sm"
          style={{ background: "#fff", borderColor: C.line }}
        >
          <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-white" style={{ background: C.maroon }}>
            Open source
          </span>
          Free forever on your own machine
          <span aria-hidden>→</span>
        </a>
        <h1 className="mt-8 text-[46px] leading-[1.02] font-normal tracking-[-0.045em] sm:text-[80px]">
          Captions for every <Em>Indian</Em>
          <br />
          <span style={{ color: C.soft }}>language.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed sm:text-[19px]" style={{ color: C.soft }}>
          Hindi, Tamil, Telugu and 8 more, in English letters or their own script, timed word by word.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button onClick={onStart} className="h-12 rounded-xl px-6 text-[15px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(58,21,21,0.6)]" style={{ background: C.maroon }}>
            Caption a reel · ₹{RUPEES_PER_MINUTE}/min
          </button>
          <a href="#open-source" className="flex h-12 items-center gap-2 rounded-xl border px-6 text-[15px] font-medium" style={{ background: "#fff", borderColor: C.line }}>
            <GitHubIcon className="size-4" /> Run it free · ₹0
          </a>
        </div>
      </div>

      {/* The product, with what matters pinned around it. */}
      <div className="relative mx-auto mt-16 grid max-w-6xl items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
        <div className="order-2 space-y-4 lg:order-1 lg:justify-self-end">
          <Floating title="Your letters or theirs" body={<>kya scene hai<br />क्या सीन है</>} />
          <Floating title="Word-perfect timing" body="Each word pops in as it's said." />
        </div>
        <div className="order-1 lg:order-2">
          <HeroDemo />
        </div>
        <div className="order-3 space-y-4 lg:justify-self-start">
          <Floating dark title="Free to self-host" body={<span className="font-mono text-[12px]">$ git clone …/lafz</span>} />
          <Floating title="Export anything" body="MP4 · Transparent · Green screen · SRT" />
        </div>
      </div>
    </section>
  );
}

function Floating({ title, body, dark }: { title: string; body: React.ReactNode; dark?: boolean }) {
  return (
    <div
      className="w-full max-w-[280px] rounded-2xl border p-4 text-left shadow-[0_18px_40px_-24px_rgba(29,23,20,0.45)] lg:w-[260px]"
      style={dark ? { background: C.maroon, borderColor: C.maroon, color: "#f6efe7" } : { background: C.card, borderColor: C.line }}
    >
      <div className="text-[13px] font-semibold">{title}</div>
      <div className="mt-1.5 text-[14px] leading-snug opacity-75">{body}</div>
    </div>
  );
}

/** The maroon "about" band: one big sentence with small picture chips, then three numbers. */
function Statement() {
  const chip = (children: React.ReactNode) => (
    <span className="mx-1 inline-flex -translate-y-1 items-center rounded-full bg-white/10 px-2.5 py-0.5 align-middle text-[15px] font-medium tracking-normal">
      {children}
    </span>
  );
  return (
    <section className="mx-4 mb-24 rounded-[32px] px-6 py-20 text-center sm:px-12" style={{ background: C.maroon, color: "#f6efe7" }}>
      <span className="rounded-md bg-white/10 px-2.5 py-1 text-[12px] font-medium tracking-wide">About lafz</span>
      <p className="mx-auto mt-8 max-w-4xl text-[26px] leading-[1.3] tracking-[-0.02em] sm:text-[38px]">
        Lafz {chip("🎙️ 11 languages")} captions your reels the way Indians actually type, and it&apos;s{" "}
        {chip(<><GitHubIcon className="mr-1.5 size-3.5" /> open source</>)} <Em>free to run</Em>{" "}
        <span className="opacity-50">on your own machine, forever. Or use ours and pay only for the minutes you caption.</span>
      </p>
      <div className="mx-auto mt-14 grid max-w-3xl grid-cols-3 divide-x divide-white/15">
        {[
          ["₹0", "to run it yourself"],
          ["11", "Indian languages"],
          [`₹${RUPEES_PER_MINUTE}`, "per minute, hosted"],
        ].map(([n, l]) => (
          <div key={l} className="px-2">
            <div className="text-[34px] font-light tracking-[-0.03em] sm:text-[44px]">{n}</div>
            <div className="mt-1 text-[12px] opacity-60 sm:text-[13px]">{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Head({ kicker, title, sub, light }: { kicker: string; title: React.ReactNode; sub?: string; light?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="rounded-md px-2.5 py-1 text-[12px] font-medium" style={light ? { background: "rgba(255,255,255,0.1)" } : { background: "#fff", border: `1px solid ${C.line}` }}>
        {kicker}
      </span>
      <h2 className="mt-5 text-[36px] leading-[1.08] font-normal tracking-[-0.035em] sm:text-[52px]">{title}</h2>
      {sub && (
        <p className="mt-4 text-[17px] leading-relaxed" style={{ color: light ? "rgba(246,239,231,0.65)" : C.soft }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function Command({ text, dark }: { text: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group flex h-12 w-full max-w-md items-center gap-3 rounded-xl border px-4 font-mono text-[13px]"
      style={dark ? { borderColor: "rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.25)" } : { borderColor: C.line, background: "#fff" }}
    >
      <span className="opacity-40">$</span>
      <span className="min-w-0 flex-1 truncate text-left">{text.replace("https://", "")}</span>
      <span className="text-[11px] opacity-50 group-hover:opacity-100">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function Dropzone({ onFile, error, pickRef }: { onFile: OnFile; error?: string; pickRef: React.RefObject<() => void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [dictionary, setDictionary] = useState("");
  const [language, setLanguage] = useState("hindi");
  const [script, setScript] = useState<Script>("latin");
  const lang = languageById(language);
  useEffect(() => {
    pickRef.current = () => input.current?.click();
  }, [pickRef]);

  const pick = (f?: File | null) => {
    if (f && (f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name))) onFile(f, { dictionary, language, script });
  };
  const field = { background: "#fff", borderColor: C.line };

  return (
    <div>
      <div className="text-center">
        <span className="rounded-md border px-2.5 py-1 text-[12px] font-medium" style={field}>Try it</span>
        <h3 className="mt-4 text-[30px] leading-tight font-normal tracking-[-0.03em] sm:text-[38px]">
          Drop a reel. <Em>Captions in seconds.</Em>
        </h3>
      </div>
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
        className="mt-8 flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 transition"
        style={{ borderColor: drag ? C.maroon : "rgba(29,23,20,0.2)", background: drag ? "#fff" : "rgba(255,255,255,0.55)" }}
      >
        <span className="flex size-11 items-center justify-center rounded-xl text-white" style={{ background: C.maroon }}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
          </svg>
        </span>
        <span className="mt-4 text-[16px] font-medium">Drop a video or click to browse</span>
        <span className="mt-1 text-[13px]" style={{ color: C.soft }}>MP4 or MOV, up to 5 min. The video stays on your device.</span>
      </button>
      <input ref={input} type="file" accept="video/*,.mov,.mp4" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      <div className="mt-5 grid gap-3 text-[13px] sm:grid-cols-[1fr_1.4fr]">
        <label className="block">
          <span style={{ color: C.soft }}>Language</span>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border px-3 outline-none" style={field}>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span style={{ color: C.soft }}>Write in</span>
          <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-xl border p-1" style={field}>
            {(["latin", "native"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScript(s)}
                className="rounded-lg px-2.5 py-1.5 text-left transition"
                style={script === s ? { background: C.maroon, color: "#fff" } : { color: C.soft }}
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
        className="mt-3 h-11 w-full rounded-xl border px-3 text-[13px] outline-none placeholder:opacity-60"
        style={field}
      />
      {error && <p className="mt-4 rounded-xl border border-red-700/20 bg-red-700/10 px-4 py-3 text-[13px] text-red-900">{error}</p>}
      <p className="mt-5 text-center text-[12px]" style={{ color: C.soft }}>
        ₹{RUPEES_PER_MINUTE} a minute here, or <a href="#open-source" className="underline">free on your own machine</a>.
      </p>
    </div>
  );
}

function Progress({ step, name }: { step: number; name: string }) {
  return (
    <div className="mx-auto max-w-md py-4">
      <div className="text-[12px] font-medium uppercase tracking-[0.12em]" style={{ color: C.soft }}>Working</div>
      <div className="mt-2 truncate text-[22px] tracking-[-0.02em]">{name}</div>
      <ol className="mt-6 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-[15px]">
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${i === step ? "animate-pulse" : ""}`}
              style={i < step ? { background: C.maroon, color: "#fff" } : { border: `2px solid ${i === step ? C.maroon : C.line}` }}
            >
              {i < step ? "✓" : ""}
            </span>
            <span style={i > step ? { color: C.soft } : undefined}>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-[13px]" style={{ color: C.soft }}>A 1-minute reel takes about 20 seconds.</p>
    </div>
  );
}

const COMPARE = [
  { heard: "भाई ये जगह एकदम मस्त है", generic: "Bhai yeah jaga ek dum must hey", ours: "bhai yeh jagah ekdum mast hai" },
  { heard: "यार क्या scene है", generic: "Your car seen hey", ours: "yaar kya scene hai" },
  { heard: "PhonePe से pay कर दो", generic: "phone pay say pay kar do", ours: "PhonePe se pay kar do" },
];

function Compare() {
  return (
    <section className="border-t px-4 py-24" style={{ borderColor: C.line }}>
      <div className="mx-auto max-w-5xl">
        <Head kicker="Accuracy" title={<>Spelled the way <Em>you&apos;d text it.</Em></>} sub="Generic captioners write Hindi in Devanagari or force it into English words. Same audio, three ways:" />
        <div className="mt-12 overflow-hidden rounded-[24px] border" style={{ background: C.card, borderColor: C.line }}>
          <div className="hidden grid-cols-3 border-b px-6 py-3 text-[12px] font-medium uppercase tracking-[0.1em] sm:grid" style={{ borderColor: C.line, color: C.soft }}>
            <span>Said</span>
            <span>Generic auto-captions</span>
            <span style={{ color: C.maroon }}>lafz</span>
          </div>
          {COMPARE.map((r, i) => (
            <div key={r.ours} className="grid gap-1 px-6 py-5 text-[16px] sm:grid-cols-3 sm:gap-4" style={i ? { borderTop: `1px solid ${C.line}` } : undefined}>
              <span style={{ color: C.soft }}>{r.heard}</span>
              <span className="line-through decoration-black/25" style={{ color: C.soft }}>{r.generic}</span>
              <span className="font-medium">{r.ours}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Languages() {
  return (
    <section id="languages" className="border-t px-4 py-24" style={{ borderColor: C.line }}>
      <div className="mx-auto max-w-6xl">
        <Head kicker="Languages" title={<>Eleven languages. <Em>Your letters or theirs.</Em></>} sub="Every language can be captioned in English letters, the way people text, or in its own script. English words stay in English either way." />
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LANGUAGES.map((l) => (
            <div key={l.id} className="rounded-2xl border px-5 py-4" style={{ background: C.card, borderColor: C.line }}>
              <div className="text-[16px] font-medium">{l.name}</div>
              <div className="mt-1 text-[14px]" style={{ color: C.soft }}>{l.latinSample}</div>
              <div className="text-[14px]" style={{ color: C.soft }}>{l.nativeSample}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const MAC_STEPS = [
  { c: "git clone https://github.com/aditya01k/lafz && cd lafz", note: "Get lafz" },
  { c: "./scripts/setup-local.sh", note: "One time: installs the models (about 5 GB)" },
  { c: "pnpm local", note: "Open localhost:3300. Works with Wi-Fi off" },
];

/** Local mode: the whole thing on an Apple Silicon Mac, offline, no keys. */
function OnYourMac() {
  return (
    <section id="mac" className="border-t px-4 py-24" style={{ borderColor: C.line }}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="rounded-md border px-2.5 py-1 text-[12px] font-medium" style={{ background: "#fff", borderColor: C.line }}>
            Local mode
          </span>
          <h2 className="mt-5 text-[36px] leading-[1.08] font-normal tracking-[-0.035em] sm:text-[52px]">
            Your Mac is the <Em>caption studio.</Em>
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed" style={{ color: C.soft }}>
            Whisper and an open language model run right on Apple Silicon. No internet, no API keys, no per-minute bill. Your
            footage never leaves your desk.
          </p>
          <div className="mt-7 flex max-w-md flex-wrap gap-2">
            {["Offline after setup", "₹0 forever", "Any M1–M4 Mac", "Nothing uploaded", "10 Indian languages"].map((x) => (
              <span key={x} className="rounded-full border px-3 py-1.5 text-[13px]" style={{ background: C.card, borderColor: C.line }}>
                {x}
              </span>
            ))}
          </div>
          <p className="mt-7 max-w-md text-[13px] leading-relaxed" style={{ color: C.soft }}>
            Local mode uses open models. For the trickiest Hinglish and regional accents, hosted lafz (built on Sarvam&apos;s Indian
            speech models) is more accurate.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border shadow-[0_30px_60px_-30px_rgba(29,23,20,0.45)]" style={{ borderColor: C.line, background: C.ink, color: "#f6efe7" }}>
          <div className="flex h-10 items-center gap-1.5 border-b border-white/10 px-4">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 font-mono text-[12px] opacity-50">Terminal · Mac mini</span>
          </div>
          <div className="space-y-4 p-6 font-mono text-[13px] leading-relaxed">
            {MAC_STEPS.map((s) => (
              <div key={s.c}>
                <div className="opacity-40"># {s.note}</div>
                <div className="break-all">
                  <span className="opacity-40">$ </span>
                  {s.c}
                </div>
              </div>
            ))}
            <div className="text-emerald-300">✓ lafz is running on this Mac · offline</div>
          </div>
        </div>
      </div>
    </section>
  );
}

const LOCAL = [
  { c: "git clone https://github.com/aditya01k/lafz && cd lafz", note: "Get the code" },
  { c: "pnpm install", note: "Install" },
  { c: "cp .env.example .env.local", note: "Add your own Sarvam and OpenAI keys" },
  { c: "pnpm dev", note: "Open localhost:3300. Every feature, no sign-in" },
];

/** The open-source pitch, given its own dark section so it can't be missed. */
function OpenSource() {
  return (
    <section id="open-source" className="mx-4 my-8 rounded-[32px] px-6 py-20 sm:px-12" style={{ background: C.ink, color: "#f6efe7" }}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-[12px] font-medium">Open source · AGPL-3.0</span>
          <div className="mt-8 text-[96px] leading-none font-light tracking-[-0.06em] sm:text-[140px]">₹0</div>
          <h2 className="mt-4 text-[34px] leading-[1.1] tracking-[-0.03em] sm:text-[44px]">
            Free forever. <Em>On your own machine.</Em>
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed opacity-65">
            Every feature, every language, every style. No account, no limits, no watermark. Run it with your own Sarvam and
            OpenAI keys, or in local mode on a Mac with no keys at all.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={GITHUB} className="flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-[15px] font-medium text-black">
              <GitHubIcon className="size-4" /> Star on GitHub
            </a>
            <Command text={CLONE} dark />
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <div className="flex h-10 items-center gap-1.5 border-b border-white/10 px-4">
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="ml-3 font-mono text-[12px] opacity-50">Terminal</span>
          </div>
          <div className="space-y-4 p-6 font-mono text-[13px] leading-relaxed">
            {LOCAL.map((s) => (
              <div key={s.c}>
                <div className="opacity-40"># {s.note}</div>
                <div className="break-all">
                  <span className="opacity-40">$ </span>
                  {s.c}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing({ onStart }: { onStart: () => void }) {
  return (
    <section id="pricing" className="px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <Head kicker="Pricing" title={<>Run it free, or <Em>pay per minute.</Em></>} />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[24px] border p-8" style={{ background: C.card, borderColor: C.line }}>
            <div className="text-[13px] font-medium uppercase tracking-[0.12em]" style={{ color: C.soft }}>Self-hosted</div>
            <div className="mt-4 text-[56px] leading-none font-light tracking-[-0.05em]">₹0</div>
            <p className="mt-2 text-[14px]" style={{ color: C.soft }}>Open source, forever</p>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {["Every feature and style", "All 11 languages", "Unlimited videos, no watermark", "Offline on a Mac, or your own API keys"].map((x) => (
                <Check key={x}>{x}</Check>
              ))}
            </ul>
            <a href="#open-source" className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl border px-5 text-[14px] font-medium" style={{ background: "#fff", borderColor: C.line }}>
              <GitHubIcon className="size-4" /> Run it locally
            </a>
          </div>
          <div className="rounded-[24px] p-8" style={{ background: C.maroon, color: "#f6efe7" }}>
            <div className="text-[13px] font-medium uppercase tracking-[0.12em] opacity-60">Hosted</div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[56px] leading-none font-light tracking-[-0.05em]">₹{RUPEES_PER_MINUTE}</span>
              <span className="opacity-60">per minute of video</span>
            </div>
            <p className="mt-2 text-[14px] opacity-60">Prepaid credits. No subscription, never expire.</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {PACKS.map((p) => (
                <div key={p.id} className="rounded-xl bg-white/10 p-3 text-center">
                  <div className="text-[17px] font-medium">₹{p.rupees.toLocaleString("en-IN")}</div>
                  <div className="text-[12px] opacity-60">{p.minutes} min</div>
                </div>
              ))}
            </div>
            <ul className="mt-6 space-y-2.5 text-[15px]">
              {["Nothing to install", "Unlimited edits and exports", "Charged only for transcription"].map((x) => (
                <Check key={x}>{x}</Check>
              ))}
            </ul>
            <button onClick={onStart} className="mt-8 h-11 rounded-xl bg-white px-5 text-[14px] font-medium text-black">
              Caption a reel
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <svg viewBox="0 0 16 16" className="size-4 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8.5l3 3 7-7" />
      </svg>
      {children}
    </li>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
