"use client";

import { useRef, useState } from "react";

const STEPS = ["Reading the audio", "Listening to every word", "Fixing Hinglish spellings"];

export default function Upload({
  onFile,
  error,
  working,
}: {
  onFile: (f: File, dictionary: string) => void;
  error?: string;
  working?: { step: number; name: string };
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [dictionary, setDictionary] = useState("");

  const pick = (f?: File | null) => {
    if (f && (f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name))) onFile(f, dictionary);
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-12 sm:py-20">
      <div className="text-[15px] font-semibold tracking-tight">
        lafz<span className="text-accent">.</span>
      </div>
      <h1 className="mt-10 text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[44px]">
        Hinglish captions that read the way you talk.
      </h1>
      <p className="mt-4 text-[16px] leading-relaxed text-muted">
        &ldquo;Bhai yeh jagah ekdum mast hai&rdquo;, not Devanagari and not &ldquo;by yeah jag a&rdquo;. Word-by-word timing,
        10 styles, fix any word, export in a minute.
      </p>

      {working ? (
        <div className="mt-10 rounded-2xl border border-hairline bg-surface p-6">
          <div className="truncate text-[13px] text-muted">{working.name}</div>
          <ol className="mt-4 space-y-3">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-[15px]">
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    i < working.step
                      ? "bg-accent text-white"
                      : i === working.step
                        ? "animate-pulse border-2 border-accent"
                        : "border border-hairline"
                  }`}
                >
                  {i < working.step ? "✓" : ""}
                </span>
                <span className={i > working.step ? "text-muted" : ""}>{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-[13px] text-muted">A 1-minute reel takes about 20 seconds.</p>
        </div>
      ) : (
        <>
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
            className={`mt-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
              drag ? "border-accent bg-accent/10" : "border-hairline bg-surface hover:border-white/20"
            }`}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-2xl font-light text-white">
              +
            </span>
            <span className="mt-4 text-[17px] font-semibold">Drop your reel here</span>
            <span className="mt-1 text-[13px] text-muted">MP4 or MOV, up to 5 minutes. It stays on your device.</span>
          </button>
          <input
            ref={input}
            type="file"
            accept="video/*,.mov,.mp4"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <label className="mt-5 block">
            <span className="text-[13px] font-medium text-muted">Names and brands to spell right (optional)</span>
            <input
              value={dictionary}
              onChange={(e) => setDictionary(e.target.value)}
              placeholder="Rohit, Zostel, PhonePe"
              className="mt-2 w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-muted/60 focus:border-white/25"
            />
          </label>
          {error && (
            <p className="mt-5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-[14px] text-accent">{error}</p>
          )}
        </>
      )}
    </main>
  );
}
