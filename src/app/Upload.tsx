"use client";

import { useEffect, useRef, useState } from "react";
import { LANGUAGES } from "@/lib/languages";
import { HeroDemo, Playground } from "./demo";

const STEPS = ["Reading the audio", "Listening to every word", "Fixing the spellings"];
const GITHUB = "https://github.com/aditya01k/lafz";
const CLONE = "git clone https://github.com/aditya01k/lafz";

type OnFile = (f: File, opts: { dictionary: string; language: string }) => void;

export default function Upload({ onFile, error, working }: { onFile: OnFile; error?: string; working?: { step: number; name: string } }) {
  const pickRef = useRef<() => void>(() => {});
  return (
    <div className="flex-1">
      <Nav onStart={() => pickRef.current()} />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="grid-bg pointer-events-none absolute inset-0" />
          <div className="relative mx-auto max-w-5xl px-5 pt-20 pb-14 text-center sm:pt-28">
            <a
              href={GITHUB}
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white/[0.03] py-1 pr-3 pl-1.5 font-mono text-[12px] text-muted transition hover:border-white/20 hover:text-foreground"
            >
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-black">Open source</span>
              Free to run on your own machine →
            </a>
            <h1 className="headline mx-auto mt-7 max-w-4xl text-[44px] leading-[1.02] font-semibold tracking-[-0.045em] sm:text-[72px]">
              Captions for every Indian language.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-muted sm:text-[19px]">
              Hinglish, Tanglish and 10 more, spelled the way creators type, timed word by word. Open source: run it free on
              your own machine, or use ours and pay per minute.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => pickRef.current()}
                className="h-11 rounded-full bg-white px-6 text-[15px] font-medium text-black transition hover:bg-white/85"
              >
                Caption a reel
              </button>
              <Command text={CLONE} />
            </div>
          </div>

          {/* Product frame */}
          <div className="relative mx-auto max-w-5xl px-5 pb-24">
            <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_30px_120px_-30px_rgba(255,255,255,0.12)]">
              <div className="flex h-10 items-center gap-1.5 border-b border-hairline px-4">
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="ml-3 font-mono text-[12px] text-muted">lafz · new project</span>
              </div>
              <div className="grid items-center gap-10 p-6 sm:p-10 lg:grid-cols-[1fr_auto]">
                <div className="text-left">
                  {working ? <Progress {...working} /> : <Dropzone onFile={onFile} error={error} pickRef={pickRef} />}
                </div>
                <HeroDemo />
              </div>
            </div>
          </div>
        </section>

        <Features />

        <section id="styles" className="border-t border-hairline">
          <div className="mx-auto max-w-6xl px-5 py-24">
            <SectionHead kicker="Styles" title="Type a line. See it in all ten." sub="Every preview is drawn by the same renderer that exports your video." />
            <div className="mt-12">
              <Playground />
            </div>
          </div>
        </section>

        <Compare />
        <Languages />
        <RunLocally />
        <Pricing onStart={() => pickRef.current()} />
      </main>
      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-[13px] text-muted">
          <span className="flex items-center gap-2">
            <Logo /> Open source captions for Indian creators
          </span>
          <span className="flex gap-5 font-mono text-[12px]">
            <a href={GITHUB} className="hover:text-foreground">GitHub</a>
            <span>AGPL-3.0</span>
            <span>Made in India</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-1.5 text-[16px] font-semibold tracking-tight text-foreground">
      <span className="size-3 rounded-[3px] bg-accent" />
      lafz
    </span>
  );
}

function Nav({ onStart }: { onStart: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-7 px-5">
        <Logo />
        <nav className="hidden gap-6 text-[14px] text-muted md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#styles" className="hover:text-foreground">Styles</a>
          <a href="#languages" className="hover:text-foreground">Languages</a>
          <a href="#self-host" className="hover:text-foreground">Self-host</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={GITHUB}
            className="flex h-8 items-center gap-2 rounded-full border border-hairline px-3 text-[13px] text-muted transition hover:border-white/20 hover:text-foreground"
          >
            <GitHubIcon className="size-4" />
            <span className="hidden sm:inline">Star</span>
          </a>
          <button onClick={onStart} className="h-8 rounded-full bg-white px-3.5 text-[13px] font-medium text-black hover:bg-white/85">
            Caption a reel
          </button>
        </div>
      </div>
    </header>
  );
}

function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="group flex h-11 items-center gap-3 rounded-full border border-hairline bg-white/[0.03] px-5 font-mono text-[13px] text-muted transition hover:border-white/20 hover:text-foreground"
      title="Copy"
    >
      <span className="text-foreground/40">$</span>
      <span className="max-w-[62vw] truncate">{text.replace("https://", "")}</span>
      <span className="text-[11px] text-foreground/40 group-hover:text-foreground">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function Dropzone({ onFile, error, pickRef }: { onFile: OnFile; error?: string; pickRef: React.RefObject<() => void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [dictionary, setDictionary] = useState("");
  const [language, setLanguage] = useState("hinglish");
  useEffect(() => {
    pickRef.current = () => input.current?.click();
  }, [pickRef]);

  const pick = (f?: File | null) => {
    if (f && (f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name))) onFile(f, { dictionary, language });
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">Try it</div>
      <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">Drop a reel. Get captions in seconds.</h3>
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
        className={`mt-6 flex w-full flex-col items-center rounded-xl border border-dashed px-6 py-10 transition ${
          drag ? "border-white bg-white/[0.06]" : "border-white/20 bg-black hover:border-white/40"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-6 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
        </svg>
        <span className="mt-3 text-[15px] font-medium">Drop a video or click to browse</span>
        <span className="mt-1 text-[13px] text-muted">MP4 or MOV, up to 5 min. The video stays on your device.</span>
      </button>
      <input ref={input} type="file" accept="video/*,.mov,.mp4" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

      <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-[13px]">
        <label htmlFor="lang" className="text-muted">Language</label>
        <select
          id="lang"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="h-9 rounded-lg border border-hairline bg-black px-2.5 outline-none focus:border-white/30"
        >
          {LANGUAGES.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} · {l.sub}
              {l.status === "beta" ? " (beta)" : ""}
            </option>
          ))}
        </select>
        <label htmlFor="dict" className="text-muted">Spell right</label>
        <input
          id="dict"
          value={dictionary}
          onChange={(e) => setDictionary(e.target.value)}
          placeholder="Names and brands, e.g. Zostel, PhonePe"
          className="h-9 rounded-lg border border-hairline bg-black px-3 outline-none placeholder:text-muted/50 focus:border-white/30"
        />
      </div>
      {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">{error}</p>}
    </div>
  );
}

function Progress({ step, name }: { step: number; name: string }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">Working</div>
      <div className="mt-2 truncate text-[20px] font-semibold tracking-[-0.02em]">{name}</div>
      <ol className="mt-6 space-y-4">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-[15px]">
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                i < step ? "bg-white text-black" : i === step ? "animate-pulse border-2 border-white" : "border border-white/20"
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

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">{kicker}</div>
      <h2 className="headline mt-3 text-[34px] leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[44px]">{title}</h2>
      {sub && <p className="mt-4 text-[17px] leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

const FEATURES = [
  { k: "01", title: "Spelled like you text", body: "“yaar kya scene hai”, not “Your car seen hey”. Every word is rewritten in the casual Roman spelling creators actually use." },
  { k: "02", title: "Timed word by word", body: "Each word pops in as it's said. Fix a word and its timing stays put." },
  { k: "03", title: "Built on Sarvam", body: "India's own speech models hear Indian accents, code-switching and regional languages properly." },
  { k: "04", title: "Renders on your device", body: "Export runs in your browser. No upload queue, no waiting on a server, your video never leaves." },
  { k: "05", title: "Made for editors too", body: "Transparent WebM for Premiere, DaVinci and Final Cut. Green screen and SRT for everything else." },
  { k: "06", title: "Open source", body: "AGPL-3.0. Read the code, run it on your own machine for free, change anything." },
];

function Features() {
  return (
    <section id="features" className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead kicker="Features" title="A full caption studio. Open source." />
        <div className="mt-12 grid overflow-hidden rounded-2xl border border-hairline sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.k} className="-mt-px -ml-px border-t border-l border-hairline p-7">
              <div className="font-mono text-[12px] text-muted">{f.k}</div>
              <div className="mt-4 text-[17px] font-medium tracking-[-0.01em]">{f.title}</div>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const COMPARE = [
  { heard: "भाई ये जगह एकदम मस्त है", generic: "Bhai yeah jaga ek dum must hey", ours: "bhai yeh jagah ekdum mast hai" },
  { heard: "यार क्या scene है", generic: "Your car seen hey", ours: "yaar kya scene hai" },
  { heard: "PhonePe से pay कर दो", generic: "phone pay say pay kar do", ours: "PhonePe se pay kar do" },
];

function Compare() {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead kicker="Accuracy" title="Generic captioners can't spell Hinglish." sub="They write Hindi in Devanagari or force it into English words. Same audio, three ways:" />
        <div className="mt-12 overflow-hidden rounded-2xl border border-hairline">
          <div className="hidden grid-cols-3 border-b border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-muted sm:grid">
            <span>Said</span>
            <span>Generic auto-captions</span>
            <span className="text-foreground">lafz</span>
          </div>
          {COMPARE.map((r, i) => (
            <div key={r.ours} className={`grid gap-1 px-6 py-5 text-[15px] sm:grid-cols-3 sm:gap-4 ${i ? "border-t border-hairline" : ""}`}>
              <span className="text-muted">{r.heard}</span>
              <span className="text-muted/70 line-through decoration-white/25">{r.generic}</span>
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
    <section id="languages" className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead
          kicker="Languages"
          title="Twelve languages, Roman or native script."
          sub="Hinglish is live. The rest are in beta and get better with every word creators correct."
        />
        <div className="mt-12 grid overflow-hidden rounded-2xl border border-hairline sm:grid-cols-2 lg:grid-cols-4">
          {LANGUAGES.map((l) => (
            <div key={l.id} className="-mt-px -ml-px flex items-center justify-between border-t border-l border-hairline px-5 py-4">
              <div>
                <div className="text-[15px] font-medium">{l.name}</div>
                <div className="text-[13px] text-muted">{l.sub}</div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[11px] ${
                  l.status === "live" ? "bg-white text-black" : "border border-hairline text-muted"
                }`}
              >
                {l.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS_LOCAL = [
  { c: "git clone https://github.com/aditya01k/lafz && cd lafz", note: "Get the code" },
  { c: "pnpm install", note: "Install" },
  { c: "cp .env.example .env.local", note: "Add your Sarvam and OpenAI keys" },
  { c: "pnpm dev", note: "Open localhost:3300" },
];

function RunLocally() {
  return (
    <section id="self-host" className="border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 lg:grid-cols-[1fr_1.15fr] lg:items-center">
        <div>
          <SectionHead
            kicker="Self-host"
            title="Free forever on your own machine."
            sub="Every feature, no account, no limits. You only pay Sarvam and OpenAI for your own usage, roughly ₹1 a minute of video."
          />
          <a
            href={GITHUB}
            className="mt-8 inline-flex h-10 items-center gap-2 rounded-full border border-hairline px-4 text-[14px] font-medium transition hover:border-white/25"
          >
            <GitHubIcon className="size-4" /> View source on GitHub
          </a>
        </div>
        <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
          <div className="flex h-10 items-center border-b border-hairline px-4 font-mono text-[12px] text-muted">Terminal</div>
          <div className="space-y-4 p-6 font-mono text-[13px] leading-relaxed">
            {STEPS_LOCAL.map((s) => (
              <div key={s.c}>
                <div className="text-muted/60"># {s.note}</div>
                <div className="break-all">
                  <span className="text-muted/60">$ </span>
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

const PACKS = [
  { inr: 200, mins: 100 },
  { inr: 500, mins: 250 },
  { inr: 1000, mins: 500 },
];

function Pricing({ onStart }: { onStart: () => void }) {
  return (
    <section id="pricing" className="border-t border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <SectionHead kicker="Pricing" title="Run it free, or pay only for what you caption." />
        <div className="mt-12 grid overflow-hidden rounded-2xl border border-hairline lg:grid-cols-2">
          <div className="p-8">
            <div className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">Self-hosted</div>
            <div className="mt-4 text-[44px] font-semibold tracking-[-0.04em]">₹0</div>
            <p className="mt-1 text-[14px] text-muted">Open source, forever</p>
            <ul className="mt-6 space-y-2.5 text-[14px]">
              {["Every feature and style", "Every language", "Unlimited videos", "Bring your own API keys"].map((x) => (
                <Check key={x}>{x}</Check>
              ))}
            </ul>
            <a href="#self-host" className="mt-8 inline-flex h-10 items-center rounded-full border border-hairline px-5 text-[14px] font-medium hover:border-white/25">
              Run it locally
            </a>
          </div>
          <div className="border-t border-hairline bg-white/[0.025] p-8 lg:border-t-0 lg:border-l">
            <div className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted">Hosted</div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[44px] font-semibold tracking-[-0.04em]">₹2</span>
              <span className="text-muted">per minute of video</span>
            </div>
            <p className="mt-1 text-[14px] text-muted">Prepaid credits. No subscription, credits never expire.</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {PACKS.map((p) => (
                <div key={p.inr} className="rounded-xl border border-hairline bg-black p-3 text-center">
                  <div className="text-[17px] font-semibold">₹{p.inr.toLocaleString("en-IN")}</div>
                  <div className="font-mono text-[12px] text-muted">{p.mins} min</div>
                </div>
              ))}
            </div>
            <ul className="mt-6 space-y-2.5 text-[14px]">
              {["Nothing to install", "Unlimited exports and edits", "Charged only for transcription"].map((x) => (
                <Check key={x}>{x}</Check>
              ))}
            </ul>
            <button onClick={onStart} className="mt-8 h-10 rounded-full bg-white px-5 text-[14px] font-medium text-black hover:bg-white/85">
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
      <svg viewBox="0 0 16 16" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
