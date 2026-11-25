"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Line } from "@/lib/lines";
import { checkAll, DEFAULT_QC } from "@/lib/qc";
import { drawCaptions, linesFor, loadFonts, templateById } from "@/lib/templates";
import type { Word } from "@/lib/types";
import { smpte } from "./editor/time";
import "./fonts";

/**
 * The Pro editor, running for real on the demo reel: the captions, frame timecodes, quality
 * flags and timeline below are computed by the same code the app uses, and follow playback.
 */

const FPS = 30;
const STYLE = { ...templateById("boxed").style, size: templateById("boxed").style.size * 1.15, y: 0.645 };

export function EditorShowcase() {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const wave = useRef<HTMLCanvasElement>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [t, setT] = useState(0);
  const [duration, setDuration] = useState(13.52);
  const lines = useMemo(() => (words.length ? linesFor(words, STYLE) : []), [words]);
  const issues = useMemo(() => checkAll(lines, { ...DEFAULT_QC, fps: FPS }), [lines]);
  const linesRef = useRef<Line[]>([]);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    void fetch("/reels/demo.json")
      .then((r) => r.json())
      .then((w: Word[]) => {
        setWords(w);
        void loadFonts(STYLE, w.map((x) => x.text).join(" "));
      });
  }, []);

  // Captions on the video, and the playhead, every frame.
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const v = video.current;
      const c = canvas.current;
      if (!v || !c) return;
      const ctx = c.getContext("2d")!;
      ctx.clearRect(0, 0, c.width, c.height);
      drawCaptions(ctx, c.width, c.height, v.currentTime, linesRef.current, STYLE);
      if (now - last > 50) {
        last = now;
        setT(v.currentTime);
      }
    };
    raf = requestAnimationFrame(tick);
    void video.current?.play().catch(() => {});
    return () => cancelAnimationFrame(raf);
  }, []);

  // The real waveform of the reel's audio.
  useEffect(() => {
    let off = false;
    void (async () => {
      try {
        const buf = await (await fetch("/reels/demo.mp4")).arrayBuffer();
        const ac = new AudioContext();
        const audio = await ac.decodeAudioData(buf);
        void ac.close();
        const c = wave.current;
        if (off || !c) return;
        const data = audio.getChannelData(0);
        const W = (c.width = c.clientWidth * 2);
        const H = (c.height = c.clientHeight * 2);
        const ctx = c.getContext("2d")!;
        const per = Math.floor(data.length / W);
        const peaks: number[] = [];
        for (let x = 0; x < W; x++) {
          let m = 0;
          for (let j = x * per; j < (x + 1) * per; j += 8) m = Math.max(m, Math.abs(data[j]));
          peaks.push(m);
        }
        const top = Math.max(...peaks) || 1;
        ctx.fillStyle = "rgba(120,200,255,0.4)";
        peaks.forEach((m, x) => {
          const h = Math.max(1, Math.sqrt(m / top) * (H - 4));
          ctx.fillRect(x, (H - h) / 2, 1, h);
        });
      } catch {}
    })();
    return () => {
      off = true;
    };
  }, []);

  const active = lines.findIndex((l) => t >= l.start && t < l.end);
  const first = Math.max(0, Math.min(lines.length - 6, active - 2));
  const shown = lines.slice(first, first + 6);
  const pct = (s: number) => `${(s / duration) * 100}%`;

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0a0a0a] text-left text-[#ededed] shadow-[0_50px_120px_-30px_rgba(58,21,21,0.55)]">
      {/* Title bar */}
      <div className="flex h-11 items-center gap-2 border-b border-white/[0.08] px-4 text-[12px]">
        <span className="font-semibold">
          lafz<span className="text-accent">.</span>
        </span>
        <span className="hidden text-[#a1a1a1] sm:inline">demo.mp4</span>
        <span className="flex-1" />
        <span className="flex rounded-full border border-white/[0.08] p-0.5 text-[11px]">
          <span className="rounded-full px-2.5 py-0.5 text-[#a1a1a1]">Simple</span>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5">Pro</span>
        </span>
        <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-accent-ink">Export</span>
      </div>

      <div className="grid sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* Program monitor */}
        <div className="flex items-center justify-center bg-black/40 p-4">
          <div className="relative aspect-[9/16] w-full max-w-[230px] overflow-hidden rounded-lg bg-black">
            <video
              ref={video}
              src="/reels/demo.mp4"
              poster="/reels/demo-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 13.52)}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <canvas ref={canvas} width={540} height={960} className="absolute inset-0 h-full w-full" />
            <div className="pointer-events-none absolute inset-[5%] rounded border border-dashed border-white/25" />
          </div>
        </div>

        {/* Captions panel */}
        <div className="hidden border-l border-white/[0.08] sm:block">
          <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-2.5 text-[11px] text-[#a1a1a1]">
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[#ededed]">Captions</span>
            <span>Transcript</span>
            <span>Style</span>
            <span className="flex-1" />
            <span className="text-amber-200">{issues.filter((x) => x.length).length} to check</span>
          </div>
          <div className="divide-y divide-white/[0.08]">
            {shown.map((l, k) => {
              const i = first + k;
              const live = i === active;
              return (
                <div key={l.words[0].id} className={`grid grid-cols-[22px_1fr] gap-x-2 px-4 py-2 transition-colors ${live ? "bg-accent/10" : ""}`}>
                  <span className={`pt-0.5 text-[10px] tabular-nums ${live ? "text-accent" : "text-[#a1a1a1]"}`}>{i + 1}</span>
                  <div className="min-w-0">
                    <div className="flex gap-2 text-[10px] tabular-nums text-[#a1a1a1]">
                      <span>{smpte(l.start, FPS)}</span>
                      <span>→</span>
                      <span>{smpte(l.end, FPS)}</span>
                      <span>{Math.round((l.end - l.start) * FPS)}f</span>
                    </div>
                    <div className="mt-0.5 truncate text-[13px]">{l.words.map((w) => w.text).join(" ")}</div>
                    {issues[i]?.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {issues[i].map((x) => (
                          <span key={x.kind} className="rounded bg-amber-400/10 px-1.5 py-px text-[9px] font-medium text-amber-200">
                            {x.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transport and timeline */}
      <div className="border-t border-white/[0.08] px-4 pb-4 pt-2.5">
        <div className="mb-2 flex items-center gap-3 text-[11px] text-[#a1a1a1]">
          <span className="tabular-nums">
            <span className="text-[#ededed]">{smpte(t, FPS)}</span> / {smpte(duration, FPS)} <span className="text-[9px]">30 fps</span>
          </span>
          <span className="hidden gap-3 sm:flex">
            {["Split ⌘K", "Merge M", "In I", "Out O"].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </span>
          <span className="flex-1" />
          <span className="text-accent">Snap</span>
        </div>
        <div className="relative h-[92px] overflow-hidden rounded-md border border-white/[0.08] bg-black/50">
          <div className="absolute inset-x-0 top-0 h-5 border-b border-white/[0.08] bg-white/[0.03]">
            {Array.from({ length: Math.floor(duration / 2) + 1 }, (_, k) => k * 2).map((s) => (
              <span key={s} className="absolute top-0 h-full border-l border-white/15 pl-1 text-[9px] leading-5 tabular-nums text-[#a1a1a1]" style={{ left: pct(s) }}>
                {smpte(s, FPS).slice(3)}
              </span>
            ))}
          </div>
          <canvas ref={wave} className="absolute inset-x-0 bottom-0 h-[30px] w-full" />
          {lines.map((l, i) => (
            <div
              key={l.words[0].id}
              className={`absolute top-[26px] h-[30px] overflow-hidden rounded border px-1 text-[9px] leading-[28px] ${
                i === active ? "border-accent bg-accent/30" : "border-white/15 bg-white/[0.12]"
              }`}
              style={{ left: pct(l.start), width: `calc(${pct(l.end - l.start)} - 1px)` }}
            >
              <span className="whitespace-nowrap">{l.words.map((w) => w.text).join(" ")}</span>
            </div>
          ))}
          <div className="absolute inset-y-0 w-px bg-accent" style={{ left: pct(t) }} />
        </div>
      </div>
    </div>
  );
}
