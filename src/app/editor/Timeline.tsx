"use client";

import { useEffect, useRef, useState } from "react";
import { moveCaption, trimEdge } from "@/lib/edit";
import type { Line } from "@/lib/lines";
import type { Word } from "@/lib/types";
import { clock } from "./time";

/**
 * The caption track, like Premiere's: a ruler, the audio waveform, and one block per caption.
 * Drag a block to move it, drag its edges to trim it, click or drag the ruler to scrub.
 * Edges snap to the playhead and to neighbouring captions.
 */

type Drag = { kind: "move" | "in" | "out"; line: Line; prev?: Line; next?: Line; base: Word[]; x0: number; moved: boolean } | { kind: "scrub" } | { kind: "pan"; x0: number; t0: number };

const SNAP_PX = 8;

export default function Timeline({
  lines,
  words,
  duration,
  time,
  peaks,
  selected,
  onSelect,
  onSeek,
  onLive,
  onCommit,
  zoom,
  setZoom,
}: {
  lines: Line[];
  words: Word[];
  duration: number;
  time: number;
  /** Loudness per 10 ms, 0–1. */
  peaks: Float32Array | null;
  selected: number;
  onSelect: (i: number) => void;
  onSeek: (t: number) => void;
  /** A drag in progress: show it, don't keep it in history yet. */
  onLive: (w: Word[]) => void;
  /** A finished drag: one undo step back to `base`. */
  onCommit: (base: Word[]) => void;
  /** Pixels per second; 0 = fit the whole video. */
  zoom: number;
  setZoom: (z: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const wave = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(800);
  const [left, setLeft] = useState(0); // time at the left edge
  const drag = useRef<Drag | null>(null);
  const [snapAt, setSnapAt] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const fit = Math.max(1, width / Math.max(duration, 0.1));
  const pps = zoom > 0 ? Math.max(fit, zoom) : fit;
  const span = width / pps;
  const maxLeft = Math.max(0, duration - span);
  const l0 = Math.min(Math.max(0, left), maxLeft);
  const X = (t: number) => (t - l0) * pps;
  const T = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    return l0 + (clientX - r.left) / pps;
  };

  // Keep the playhead in view while playing.
  useEffect(() => {
    if (time < l0 || time > l0 + span * 0.95) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- following the playhead
      setLeft(Math.min(maxLeft, Math.max(0, time - span * 0.1)));
    }
  }, [time, l0, span, maxLeft]);

  // Waveform, drawn for just the visible window.
  useEffect(() => {
    const c = wave.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const h = c.clientHeight;
    c.width = Math.round(width * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, h);
    if (!peaks) return;
    ctx.fillStyle = "rgba(120, 200, 255, 0.35)";
    for (let x = 0; x < width; x++) {
      const a = Math.floor((l0 + x / pps) * 100);
      const b = Math.max(a + 1, Math.floor((l0 + (x + 1) / pps) * 100));
      let m = 0;
      for (let i = a; i < b && i < peaks.length; i++) m = Math.max(m, peaks[i]);
      const bar = Math.max(1, m * (h - 4));
      ctx.fillRect(x, (h - bar) / 2, 1, bar);
    }
  }, [peaks, width, l0, pps]);

  /** Snaps t to the playhead or any caption edge within a few pixels. */
  const snap = (t: number, skip: Line) => {
    const targets = [time, 0, duration];
    for (const l of lines) if (l !== skip && l.words[0].id !== skip.words[0].id) targets.push(l.start, l.end);
    let best = t;
    let bestPx = SNAP_PX;
    for (const s of targets) {
      const d = Math.abs(s - t) * pps;
      if (d < bestPx) {
        best = s;
        bestPx = d;
      }
    }
    setSnapAt(best !== t ? best : null);
    return best;
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "scrub") return onSeek(Math.min(duration, Math.max(0, T(e.clientX))));
    if (d.kind === "pan") return setLeft(d.t0 - (e.clientX - d.x0) / pps);
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 3) return;
    d.moved = true;
    const dt = dx / pps;
    if (d.kind === "move") {
      // Snap whichever edge is closer to something.
      const s1 = snap(d.line.start + dt, d.line);
      const startSnapped = s1 !== d.line.start + dt;
      const delta = startSnapped ? s1 - d.line.start : snap(d.line.end + dt, d.line) - d.line.end;
      onLive(moveCaption(d.base, d.line, delta, d.prev, d.next));
    } else {
      const t = snap((d.kind === "in" ? d.line.start : d.line.end) + dt, d.line);
      onLive(trimEdge(d.base, d.line, d.kind, t, d.prev, d.next));
    }
  };

  const grab = (e: React.PointerEvent, kind: "move" | "in" | "out", i: number) => {
    e.stopPropagation();
    box.current!.setPointerCapture(e.pointerId);
    onSelect(i);
    drag.current = { kind, line: lines[i], prev: lines[i - 1], next: lines[i + 1], base: words, x0: e.clientX, moved: false };
  };

  const end = () => {
    const d = drag.current;
    drag.current = null;
    setSnapAt(null);
    if (d && (d.kind === "move" || d.kind === "in" || d.kind === "out") && d.moved) onCommit(d.base);
  };

  // Ruler ticks at a readable step for this zoom.
  const step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find((s) => s * pps >= 70) ?? 600;
  const ticks: number[] = [];
  for (let t = Math.floor(l0 / step) * step; t <= l0 + span; t += step) if (t >= 0) ticks.push(t);

  const visible = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.end >= l0 && l.start <= l0 + span);

  return (
    <div className="select-none">
      <div
        ref={box}
        className="relative h-[132px] overflow-hidden rounded-lg border border-hairline bg-black/50"
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerCancel={end}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            // Pinch or ⌘-scroll zooms around the pointer.
            const at = T(e.clientX);
            const next = Math.min(800, Math.max(fit, pps * Math.exp(-e.deltaY * 0.01)));
            setZoom(next <= fit * 1.01 ? 0 : next);
            const r = box.current!.getBoundingClientRect();
            setLeft(at - (e.clientX - r.left) / next);
          } else {
            setLeft(l0 + (e.deltaX || e.deltaY) / pps);
          }
        }}
      >
        {/* Ruler */}
        <div
          className="absolute inset-x-0 top-0 h-6 cursor-ew-resize border-b border-hairline bg-white/[0.03]"
          onPointerDown={(e) => {
            e.currentTarget.parentElement!.setPointerCapture(e.pointerId);
            drag.current = { kind: "scrub" };
            onSeek(Math.max(0, T(e.clientX)));
          }}
        >
          {ticks.map((t) => (
            <div key={t} className="absolute top-0 h-full border-l border-white/15 pl-1 text-[10px] leading-6 tabular-nums text-muted" style={{ left: X(t) }}>
              {clock(t, step < 1)}
            </div>
          ))}
        </div>

        {/* Waveform */}
        <canvas ref={wave} className="pointer-events-none absolute inset-x-0 bottom-0 h-[44px] w-full" />

        {/* Empty track: click to seek, drag to pan */}
        <div
          className="absolute inset-x-0 top-6 bottom-0"
          onPointerDown={(e) => {
            e.currentTarget.parentElement!.setPointerCapture(e.pointerId);
            if (e.altKey || e.button === 1) drag.current = { kind: "pan", x0: e.clientX, t0: l0 };
            else {
              drag.current = { kind: "scrub" };
              onSeek(Math.max(0, T(e.clientX)));
            }
          }}
        />

        {/* Caption blocks */}
        {visible.map(({ l, i }) => {
          const x = X(l.start);
          const w = Math.max(3, (l.end - l.start) * pps - 1);
          const on = i === selected;
          return (
            <div
              key={l.words[0].id}
              onPointerDown={(e) => grab(e, "move", i)}
              onDoubleClick={() => onSeek(l.start)}
              title={`${clock(l.start)} – ${clock(l.end)}`}
              className={`group absolute top-[34px] h-[46px] cursor-grab overflow-hidden rounded-md border text-[11px] leading-tight active:cursor-grabbing ${
                on ? "border-accent bg-accent/30 text-foreground" : "border-white/15 bg-white/[0.12] text-foreground/85 hover:bg-white/20"
              }`}
              style={{ left: x, width: w }}
            >
              <div dir="auto" className="pointer-events-none line-clamp-2 px-2 pt-1">
                {l.words.map((wd) => wd.text).join(" ")}
              </div>
              <div onPointerDown={(e) => grab(e, "in", i)} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize hover:bg-accent/60" />
              <div onPointerDown={(e) => grab(e, "out", i)} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize hover:bg-accent/60" />
            </div>
          );
        })}

        {snapAt !== null && <div className="pointer-events-none absolute inset-y-0 w-px bg-yellow-300" style={{ left: X(snapAt) }} />}

        {/* Playhead */}
        <div className="pointer-events-none absolute inset-y-0 w-px bg-accent" style={{ left: X(time) }}>
          <div className="absolute -left-[5px] top-0 h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-accent" />
        </div>
      </div>

      {/* Overview: where the window sits in the whole video; drag to pan */}
      <div
        className="relative mt-1.5 h-1.5 cursor-pointer rounded-full bg-white/10"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          setLeft(((e.clientX - r.left) / r.width) * duration - span / 2);
        }}
        onPointerMove={(e) => {
          if (!e.buttons) return;
          const r = e.currentTarget.getBoundingClientRect();
          setLeft(((e.clientX - r.left) / r.width) * duration - span / 2);
        }}
      >
        <div className="absolute inset-y-0 rounded-full bg-white/35" style={{ left: `${(l0 / duration) * 100}%`, width: `${Math.min(100, (span / duration) * 100)}%` }} />
      </div>
    </div>
  );
}
