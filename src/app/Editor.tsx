"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteCaptions, fromCues, insertCaption, mergeCaptions, splitAt, trimEdge } from "@/lib/edit";
import { parseSubtitles, type Line } from "@/lib/lines";
import { checkAll, DEFAULT_QC, type QcRules } from "@/lib/qc";
import { drawCaptions, linesFor, loadFonts, type Box, type Style } from "@/lib/templates";
import type { Word } from "@/lib/types";
import { AccountButton } from "./Account";
import CaptionList from "./editor/CaptionList";
import Simple from "./editor/Simple";
import { formatTime, type Timecode } from "./editor/time";
import Timeline from "./editor/Timeline";
import Transcript from "./editor/Transcript";
import ExportDialog from "./ExportDialog";
import StylePanel from "./StylePanel";
import type { Project } from "./Studio";

type Tab = "captions" | "transcript" | "style";
type Guides = "off" | "safe" | "reels";
type Mode = "pro" | "simple";

/** Per-browser editor preferences. */
function pref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`lafz:${key}`);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function savePref(key: string, v: unknown) {
  try {
    localStorage.setItem(`lafz:${key}`, JSON.stringify(v));
  } catch {}
}

const KEYS: [string, string][] = [
  ["Space / K", "Play or pause"],
  ["L / J", "Play faster / step back a second"],
  ["← →", "Back or forward one frame"],
  ["⇧ ← →", "Back or forward one second"],
  ["↑ ↓", "Previous or next caption"],
  ["I / O", "Set the caption's in or out point to the playhead"],
  ["⌘K or C", "Split the caption at the playhead"],
  ["M", "Merge the caption with the next one"],
  ["N", "Add a caption at the playhead"],
  ["⌫", "Delete the selected caption(s)"],
  ["⇧ click", "Select a run of captions"],
  ["⇧ Space", "Play just the selected caption"],
  ["Tab / ⇧ Tab", "Next or previous caption's text"],
  ["S", "Snapping on or off"],
  ["T", "Timecode in seconds or frames"],
  ["= / −", "Zoom the timeline in or out"],
  ["\\", "Fit the whole video in the timeline"],
  ["⌘Z / ⇧⌘Z", "Undo / redo"],
  ["Esc", "Deselect"],
];

export default function Editor({ project, onChange, onClose }: { project: Project; onChange: (p: Project) => void; onClose: () => void }) {
  const [words, setWordsRaw] = useState(project.words);
  const [style, setStyle] = useState(project.style);
  const [past, setPast] = useState<Word[][]>([]);
  const [future, setFuture] = useState<Word[][]>([]);
  const [tab, setTab] = useState<Tab>("captions");
  const [selected, setSelected] = useState(-1);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [time, setTime] = useState(0);
  const [frame, setFrame] = useState<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [guides, setGuides] = useState<Guides>("off");
  const [keysOpen, setKeysOpen] = useState(false);
  const [note, setNote] = useState("");
  const [snapX, setSnapX] = useState(false);
  const [mode, setModeRaw] = useState<Mode>(() => pref<Mode>("mode", "pro"));
  const [tcMode, setTcModeRaw] = useState<Timecode["mode"]>(() => pref<Timecode["mode"]>("timecode", "frames"));
  const [qc, setQcRaw] = useState<QcRules>(() => ({ ...DEFAULT_QC, ...pref<Partial<QcRules>>("qc", {}) }));
  const [fps, setFps] = useState(30);
  const [fpsKnown, setFpsKnown] = useState(false);
  const [snapping, setSnapping] = useState(true);
  const [anchor, setAnchor] = useState(-1);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const playUntil = useRef<number | null>(null);
  const setMode = (m: Mode) => {
    setModeRaw(m);
    savePref("mode", m);
  };
  const setTcMode = (m: Timecode["mode"]) => {
    setTcModeRaw(m);
    savePref("timecode", m);
  };
  const setQc = (q: QcRules) => {
    setQcRaw(q);
    savePref("qc", { maxCps: q.maxCps, minDuration: q.minDuration, maxDuration: q.maxDuration, maxChars: q.maxChars });
  };
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const importer = useRef<HTMLInputElement>(null);

  const lines = useMemo(() => linesFor(words, style), [words, style]);
  const duration = project.duration;
  const tc: Timecode = useMemo(() => ({ mode: tcMode, fps }), [tcMode, fps]);
  const issues = useMemo(() => checkAll(lines, { ...qc, fps }), [lines, qc, fps]);
  const FRAME = 1 / fps;

  // The video's real frame rate, so timecodes, frame steps and exports match the footage.
  useEffect(() => {
    let off = false;
    void (async () => {
      try {
        const { Input, BlobSource, ALL_FORMATS } = await import("mediabunny");
        const input = new Input({ source: new BlobSource(project.file), formats: ALL_FORMATS });
        const track = await input.getPrimaryVideoTrack();
        const stats = await track?.computePacketStats(120);
        const r = stats?.averagePacketRate;
        if (!off && r && r > 5 && r < 241) {
          // Snap to the standard rate it's closest to (29.97 reads as 29.96…).
          const std = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120, 240];
          const near = std.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a));
          setFps(Math.abs(near - r) < 0.2 ? near : Math.round(r * 1000) / 1000);
          setFpsKnown(true);
        }
      } catch {
        // Unknown container: stay on 30.
      }
    })();
    return () => {
      off = true;
    };
  }, [project.file]);

  const setWords = useCallback(
    (next: Word[]) => {
      if (next === words) return;
      setPast((p) => [...p.slice(-199), words]);
      setFuture([]);
      setWordsRaw(next);
    },
    [words],
  );
  const undo = useCallback(() => {
    if (!past.length) return;
    setFuture((f) => [words, ...f]);
    setWordsRaw(past.at(-1)!);
    setPast((p) => p.slice(0, -1));
  }, [past, words]);
  const redo = useCallback(() => {
    if (!future.length) return;
    setPast((p) => [...p, words]);
    setWordsRaw(future[0]);
    setFuture((f) => f.slice(1));
  }, [future, words]);

  useEffect(() => {
    onChange({ ...project, words, style });
  }, [words, style]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(""), 2400);
    return () => clearTimeout(id);
  }, [note]);

  // The audio waveform for the timeline, decoded once from the creator's own file.
  useEffect(() => {
    let off = false;
    void (async () => {
      try {
        const ac = new AudioContext();
        const audio = await ac.decodeAudioData(await project.file.arrayBuffer());
        void ac.close();
        const data = audio.getChannelData(0);
        const per = Math.max(1, Math.floor(audio.sampleRate / 100));
        const out = new Float32Array(Math.ceil(data.length / per));
        let top = 0;
        for (let i = 0; i < out.length; i++) {
          let m = 0;
          for (let j = i * per, e = Math.min(data.length, j + per); j < e; j += 4) m = Math.max(m, Math.abs(data[j]));
          out[i] = m;
          top = Math.max(top, m);
        }
        if (top > 0) for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(out[i] / top);
        if (!off) setPeaks(out);
      } catch {
        // No audio track, or a codec the browser can't decode: the timeline works without it.
      }
    })();
    return () => {
      off = true;
    };
  }, [project.file]);

  // Draw the captions over the video every frame; remember where they sit for dragging.
  const linesRef = useRef<Line[]>(lines);
  const styleRef = useRef<Style>(style);
  const boxRef = useRef<Box | null>(null);
  useEffect(() => {
    linesRef.current = lines;
    styleRef.current = style;
    void loadFonts(style, words.map((w) => w.text).join(" "));
  }, [lines, style, words]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = video.current;
      const c = canvas.current;
      if (v && c && c.width) {
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, c.width, c.height);
        boxRef.current = drawCaptions(ctx, c.width, c.height, v.currentTime, linesRef.current, styleRef.current);
        if (playUntil.current !== null && v.currentTime >= playUntil.current) {
          v.pause();
          playUntil.current = null;
        }
        setTime(v.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const snapFrame = useCallback(() => {
    const v = video.current;
    if (!v?.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = 240;
    c.height = 300;
    const k = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
    const w = v.videoWidth * k;
    const h = v.videoHeight * k;
    c.getContext("2d")!.drawImage(v, (c.width - w) / 2, (c.height - h) / 2, w, h);
    setFrame(c);
  }, []);

  // Word fixes teach lafz better spellings (hosted only, words only, creators can opt out).
  const fixes = useRef<{ before: string; after: string }[]>([]);
  const fixTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportFix = useCallback(
    (pairs: { before: string; after: string }[]) => {
      if (!project.language || !project.script) return;
      try {
        if (localStorage.getItem("lafz:share-fixes") === "0") return;
      } catch {}
      fixes.current.push(...pairs.filter((p) => p.before && p.after && !/\s/.test(p.after) && p.before.toLowerCase() !== p.after.toLowerCase()));
      if (fixTimer.current) clearTimeout(fixTimer.current);
      fixTimer.current = setTimeout(() => {
        const batch = fixes.current.splice(0, 50);
        if (!batch.length) return;
        void fetch("/api/corrections", {
          method: "POST",
          keepalive: true,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ language: project.language, script: project.script, pairs: batch }),
        }).catch(() => {});
      }, 4000);
    },
    [project.language, project.script],
  );

  const seek = useCallback(
    (t: number) => {
      if (video.current) video.current.currentTime = Math.min(duration, Math.max(0, t + 0.001));
    },
    [duration],
  );
  const toggle = useCallback(() => {
    const v = video.current;
    if (!v) return;
    v.playbackRate = rate;
    playUntil.current = null;
    void (v.paused ? v.play() : v.pause());
  }, [rate]);

  const current = lines.findIndex((l) => time >= l.start && time < l.end);
  const target = selected >= 0 && selected < lines.length ? selected : current;
  const range = useMemo<[number, number] | null>(
    () => (anchor >= 0 && selected >= 0 && anchor !== selected && anchor < lines.length ? [Math.min(anchor, selected), Math.min(lines.length - 1, Math.max(anchor, selected))] : null),
    [anchor, selected, lines.length],
  );
  const picked = useMemo(() => (range ? lines.slice(range[0], range[1] + 1) : target >= 0 ? [lines[target]] : []), [range, lines, target]);
  const select = useCallback(
    (i: number, extend?: boolean) => {
      if (extend && selected >= 0) {
        if (anchor < 0) setAnchor(selected);
      } else setAnchor(-1);
      setSelected(i);
    },
    [selected, anchor],
  );

  // Caption commands, shared by the toolbar, the panels and the keyboard.
  const cmd = useMemo(
    () => ({
      split: () => {
        const line = lines[current] ?? (selected >= 0 ? lines[selected] : undefined);
        const next = line ? splitAt(words, line, time) : words;
        if (next === words) return setNote(line ? "One word: nothing to split" : "Move the playhead inside a caption to split it");
        setWords(next);
        setNote("Split");
      },
      add: () => {
        const next = current >= 0 ? words : insertCaption(words, time, "New caption");
        if (next === words) return setNote("Move the playhead to a gap between captions");
        setWords(next);
        setTab("captions");
        setSelected(linesFor(next, style).findIndex((l) => Math.abs(l.start - time) < 0.01));
      },
      merge: () => {
        if (range) {
          setWords(mergeCaptions(words, picked));
          setSelected(range[0]);
          return setAnchor(-1);
        }
        if (target < 0 || target >= lines.length - 1) return;
        setWords(mergeCaptions(words, [lines[target], lines[target + 1]]));
      },
      remove: () => {
        if (!picked.length) return;
        setWords(deleteCaptions(words, picked));
        setSelected(-1);
        setAnchor(-1);
      },
      playSelection: () => {
        const v = video.current;
        if (!v || !picked.length) return;
        v.currentTime = picked[0].start + 0.001;
        playUntil.current = picked.at(-1)!.end;
        v.playbackRate = rate;
        void v.play();
      },
      setIn: () => target >= 0 && setWords(trimEdge(words, lines[target], "in", time, lines[target - 1], lines[target + 1])),
      setOut: () => target >= 0 && setWords(trimEdge(words, lines[target], "out", time, lines[target - 1], lines[target + 1])),
    }),
    [words, time, lines, target, current, selected, style, setWords, range, picked, rate],
  );

  const zoomBy = useCallback(
    (k: number) => {
      const w = window.innerWidth - 48;
      const base = zoom || w / Math.max(duration, 0.1);
      const next = Math.min(800, base * k);
      setZoom(next * duration <= w * 1.01 ? 0 : next);
    },
    [zoom, duration],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as Element | null)?.closest?.("input, textarea, select, [contenteditable]");
      const mod = e.metaKey || e.ctrlKey;
      const v = video.current;
      if (mod && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        return e.shiftKey ? redo() : undo();
      }
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        return cmd.split();
      }
      if (typing || mod || e.altKey) return;
      const k = e.key;
      const handled = () => e.preventDefault();
      if (k === " " || k === "k" || k === "K") {
        handled();
        if (k === " " && e.shiftKey) cmd.playSelection();
        else if (k === " ") toggle();
        else v?.pause();
      } else if (k === "l" || k === "L") {
        handled();
        if (!v) return;
        if (v.paused) {
          v.playbackRate = 1;
          void v.play();
        } else v.playbackRate = Math.min(4, v.playbackRate * 2);
      } else if (k === "j" || k === "J") {
        handled();
        v?.pause();
        seek(time - 1);
      } else if (k === "ArrowLeft" || k === "ArrowRight") {
        handled();
        v?.pause();
        seek(time + (k === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 1 : FRAME));
      } else if (k === "ArrowUp" || k === "ArrowDown") {
        handled();
        const down = k === "ArrowDown";
        let i: number;
        if (target >= 0) i = target + (down ? 1 : -1);
        else {
          const after = lines.findIndex((l) => l.start > time);
          i = down ? (after < 0 ? lines.length - 1 : after) : (after < 0 ? lines.length : after) - 1;
        }
        i = Math.min(lines.length - 1, Math.max(0, i));
        if (lines[i]) {
          select(i, e.shiftKey);
          seek(lines[i].start);
        }
      } else if (k === "i" || k === "I") {
        handled();
        cmd.setIn();
      } else if (k === "o" || k === "O") {
        handled();
        cmd.setOut();
      } else if (k === "s" || k === "S") {
        handled();
        setSnapping((x) => !x);
        setNote(snapping ? "Snapping off" : "Snapping on");
      } else if (k === "t" || k === "T") {
        handled();
        setTcMode(tcMode === "frames" ? "seconds" : "frames");
      } else if (k === "c" || k === "C") {
        handled();
        cmd.split();
      } else if (k === "m" || k === "M") {
        handled();
        cmd.merge();
      } else if (k === "n" || k === "N") {
        handled();
        cmd.add();
      } else if ((k === "Backspace" || k === "Delete") && selected >= 0) {
        handled();
        cmd.remove();
      } else if (k === "=" || k === "+") {
        handled();
        zoomBy(1.6);
      } else if (k === "-" || k === "_") {
        handled();
        zoomBy(1 / 1.6);
      } else if (k === "\\") {
        handled();
        setZoom(0);
      } else if (k === "Escape") {
        setAnchor(-1);
        setSelected(-1);
        setSelectedWord(null);
        setKeysOpen(false);
      } else if (k === "?" || (k === "/" && e.shiftKey)) {
        setKeysOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, cmd, toggle, seek, time, lines, target, selected, zoomBy, select, snapping, tcMode, FRAME]);

  // Drag the caption around on the video. A click anywhere else plays or pauses.
  const drag = useRef<{ x0: number; y0: number; sx: number; sy: number; moved: boolean } | null>(null);
  const inBox = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * c.width;
    const py = ((e.clientY - r.top) / r.height) * c.height;
    const b = boxRef.current;
    return !!b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  };

  const sel = selectedWord ? words.find((w) => w.id === selectedWord) : undefined;
  const sample = useMemo(() => words.slice(0, 4).map((w) => w.text).join(" ") || "kya scene hai bhai", [words]);
  const iconBtn = "flex size-9 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground disabled:opacity-30";
  const tool = "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-foreground/85 hover:bg-white/10 disabled:opacity-30";

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-hairline px-3 sm:px-4">
        <button onClick={onClose} title="Back to your videos" className={iconBtn}>
          <Icon d="M15 18l-6-6 6-6" />
        </button>
        <span className="text-[16px] font-semibold tracking-tight">
          lafz<span className="text-accent">.</span>
        </span>
        <span className="hidden min-w-0 flex-1 items-center gap-2 truncate pl-2 text-[13px] text-muted sm:flex">
          <span className="truncate">{project.file.name}</span>
          <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[11px]">Saved on this device</span>
        </span>
        <span className="flex-1 sm:hidden" />
        <div className="flex rounded-full border border-hairline p-0.5 text-[12px]" title="Simple: pick a look and export. Pro: timeline, timecode, QC.">
          {(["simple", "pro"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                snapFrame();
              }}
              className={`rounded-full px-3 py-1 font-medium capitalize ${mode === m ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={() => importer.current?.click()}
          title="Replace captions with an SRT or VTT file"
          className={`hidden h-8 rounded-full px-3 text-[13px] text-muted hover:bg-white/5 hover:text-foreground ${mode === "pro" ? "sm:block" : ""}`}
        >
          Import SRT
        </button>
        <input
          ref={importer}
          type="file"
          accept=".srt,.vtt,text/vtt"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const cues = parseSubtitles(await f.text());
            if (!cues.length) return setNote("No captions found in that file");
            setWords(fromCues(cues));
            setSelected(-1);
            setNote(`Imported ${cues.length} captions · ⌘Z to undo`);
          }}
        />
        <button onClick={() => setKeysOpen(true)} title="Keyboard shortcuts (?)" className={`${iconBtn} hidden ${mode === "pro" ? "sm:flex" : ""}`}>
          <Icon d="M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8" />
        </button>
        <AccountButton />
        <button onClick={undo} disabled={!past.length} title="Undo (⌘Z)" className={iconBtn}>
          <Icon d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />
        </button>
        <button onClick={redo} disabled={!future.length} title="Redo (⇧⌘Z)" className={iconBtn}>
          <Icon d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />
        </button>
        <button
          onClick={() => setExporting(true)}
          disabled={!size}
          className="ml-1 hidden items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-accent-ink disabled:opacity-40"
        >
          <Icon d="M12 4v12M6 10l6 6 6-6M4 20h16" className="size-4" />
          Export
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Program monitor */}
        <section className="flex min-h-0 flex-col items-center justify-center bg-black/40 p-3 lg:flex-1">
          <div
            className="relative max-h-[38dvh] max-w-full overflow-hidden rounded-lg bg-black lg:max-h-[calc(100dvh-56px-230px)]"
            style={size ? { aspectRatio: `${size.width} / ${size.height}` } : undefined}
          >
            <video
              ref={video}
              src={project.url}
              playsInline
              className="block h-full max-h-[38dvh] w-full lg:max-h-[calc(100dvh-56px-230px)]"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                const s = { width: v.videoWidth, height: v.videoHeight };
                setSize(s);
                const k = Math.min(1, 1080 / Math.max(s.width, 1));
                if (canvas.current) {
                  canvas.current.width = Math.round(s.width * k);
                  canvas.current.height = Math.round(s.height * k);
                }
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => {
                setPlaying(false);
                if (tab === "style") snapFrame();
              }}
            />
            <canvas
              ref={canvas}
              className="absolute inset-0 h-full w-full"
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d) {
                  e.currentTarget.style.cursor = inBox(e) ? "move" : "pointer";
                  return;
                }
                const r = e.currentTarget.getBoundingClientRect();
                const dx = (e.clientX - d.x0) / r.width;
                const dy = (e.clientY - d.y0) / r.height;
                if (!d.moved && Math.hypot(dx * r.width, dy * r.height) < 3) return;
                d.moved = true;
                let x = Math.min(0.9, Math.max(0.1, d.sx + dx));
                const near = Math.abs(x - 0.5) < 0.015;
                if (near) x = 0.5;
                setSnapX(near);
                setStyle((s) => ({ ...s, x, y: Math.min(0.95, Math.max(0.05, d.sy + dy)) }));
              }}
              onPointerDown={(e) => {
                if (inBox(e)) {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = { x0: e.clientX, y0: e.clientY, sx: style.x ?? 0.5, sy: style.y, moved: false };
                } else toggle();
              }}
              onPointerUp={() => {
                const d = drag.current;
                drag.current = null;
                setSnapX(false);
                if (d && !d.moved) toggle();
              }}
            />
            {snapX && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-yellow-300/80" />}
            {guides === "safe" && (
              <>
                <div className="pointer-events-none absolute inset-[5%] rounded border border-dashed border-white/40" />
                <div className="pointer-events-none absolute inset-[10%] rounded border border-dashed border-white/25" />
              </>
            )}
            {guides === "reels" && (
              <>
                <div className="pointer-events-none absolute inset-x-0 top-0 flex h-[9%] items-start border-b border-dashed border-white/60 bg-black/35 p-1.5 text-[10px] font-medium text-white">
                  Top bar
                </div>
                <div className="pointer-events-none absolute right-0 bottom-[20%] flex h-[36%] w-[15%] items-start justify-center border-l border-t border-dashed border-white/60 bg-black/35 pt-1.5 text-[10px] font-medium text-white">
                  Buttons
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[20%] items-end border-t border-dashed border-white/60 bg-black/35 p-1.5 text-[10px] font-medium text-white">
                  Name, caption and audio
                </div>
              </>
            )}
          </div>
        </section>

        {/* Panels */}
        <aside className="flex min-h-0 flex-1 flex-col border-t border-hairline bg-surface lg:w-[420px] lg:flex-none lg:border-l lg:border-t-0">
          {mode === "simple" ? (
            <>
              <div className="flex gap-1 border-b border-hairline p-2">
                {(["style", "transcript"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 rounded-lg py-2 text-[14px] font-medium ${(tab === "transcript") === (t === "transcript") ? "bg-raised text-foreground" : "text-muted hover:text-foreground"}`}
                  >
                    {t === "style" ? "Look" : "Fix words"}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {tab === "transcript" ? (
                  <Transcript
                    lines={lines}
                    activeLine={current}
                    selected={sel}
                    onSelect={(w) => {
                      setSelectedWord(w?.id ?? null);
                      if (w) seek(w.start);
                    }}
                    onSeek={seek}
                    time={time}
                    words={words}
                    setWords={setWords}
                    onFix={reportFix}
                  />
                ) : (
                  <Simple style={style} setStyle={setStyle} frame={frame} sample={sample} onExport={() => setExporting(true)} />
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-1 border-b border-hairline p-2">
                {(["captions", "transcript", "style"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTab(t);
                      if (t === "style") snapFrame();
                    }}
                    className={`flex-1 rounded-lg py-2 text-[14px] font-medium capitalize ${tab === t ? "bg-raised text-foreground" : "text-muted hover:text-foreground"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {tab === "captions" && (
                  <CaptionList
                    lines={lines}
                    words={words}
                    setWords={setWords}
                    selected={selected}
                    range={range}
                    onSelect={select}
                    activeLine={current}
                    onSeek={seek}
                    style={style}
                    setStyle={setStyle}
                    onFix={reportFix}
                    tc={tc}
                    issues={issues}
                    qc={qc}
                    setQc={setQc}
                  />
                )}
                {tab === "transcript" && (
                  <Transcript
                    lines={lines}
                    activeLine={current}
                    selected={sel}
                    onSelect={(w) => {
                      setSelectedWord(w?.id ?? null);
                      if (w) seek(w.start);
                    }}
                    onSeek={seek}
                    time={time}
                    words={words}
                    setWords={setWords}
                    onFix={reportFix}
                  />
                )}
                {tab === "style" && <StylePanel style={style} onChange={setStyle} frame={frame} />}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Transport and timeline */}
      {mode === "simple" ? (
        <footer className="flex shrink-0 items-center gap-3 border-t border-hairline bg-surface px-4 py-3">
          <button onClick={toggle} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[12px] text-black" aria-label={playing ? "Pause" : "Play"}>
            {playing ? "❚❚" : "▶"}
          </button>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={time}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Position in the video"
            className="min-w-0 flex-1 accent-[var(--accent)]"
          />
          <span className="shrink-0 text-[12px] tabular-nums text-muted">
            {formatTime(time, { mode: "seconds", fps })} / {formatTime(duration, { mode: "seconds", fps })}
          </span>
        </footer>
      ) : (
      <footer className="shrink-0 border-t border-hairline bg-surface px-3 pb-3 pt-2">
        <div className="mb-2 flex items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&>*]:shrink-0">
          <button onClick={toggle} className="flex size-8 items-center justify-center rounded-full bg-white text-[12px] text-black" aria-label={playing ? "Pause" : "Play"}>
            {playing ? "❚❚" : "▶"}
          </button>
          <button
            onClick={() => setTcMode(tcMode === "frames" ? "seconds" : "frames")}
            title={`${fpsKnown ? `${fps} fps from your video` : "Frame rate unknown, assuming 30"} · click or T to switch`}
            className="ml-1 mr-1 rounded-md px-1.5 py-1 text-[12px] tabular-nums text-muted hover:bg-white/5"
          >
            <span className="text-foreground">{formatTime(time, tc)}</span> / {formatTime(duration, tc)}
            {tcMode === "frames" && <span className="ml-1.5 text-[10px]">{fps}</span>}
          </button>
          <select
            value={rate}
            onChange={(e) => {
              const r = Number(e.target.value);
              setRate(r);
              if (video.current) video.current.playbackRate = r;
            }}
            title="Playback speed"
            className="h-7 rounded-md border border-hairline bg-transparent px-1 text-[11px] text-muted outline-none"
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
              <option key={r} value={r}>
                {r}×
              </option>
            ))}
          </select>
          <button
            className={tool}
            onClick={() => {
              setMuted(!muted);
              if (video.current) video.current.muted = !muted;
            }}
            title="Mute"
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button className={tool} onClick={cmd.playSelection} disabled={!picked.length} title="Play the selected caption (⇧Space)">
            Play sel.
          </button>
          <span className="mx-1 h-5 w-px bg-hairline" />
          <button className={tool} onClick={cmd.split} title="Split at playhead (⌘K)">
            Split
          </button>
          <button className={tool} onClick={cmd.add} title="Add a caption at the playhead (N)">
            Add
          </button>
          <button className={tool} onClick={cmd.merge} disabled={!range && (target < 0 || target >= lines.length - 1)} title="Merge with next, or the selected run (M)">
            Merge
          </button>
          <button className={tool} onClick={cmd.setIn} disabled={target < 0} title="Set in point to playhead (I)">
            In
          </button>
          <button className={tool} onClick={cmd.setOut} disabled={target < 0} title="Set out point to playhead (O)">
            Out
          </button>
          <button className={`${tool} text-red-300`} onClick={cmd.remove} disabled={!picked.length} title="Delete caption(s) (⌫)">
            Delete
          </button>
          {note && <span className="ml-2 rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-foreground">{note}</span>}
          <span className="flex-1" />
          <div className="flex items-center gap-0.5 rounded-lg border border-hairline p-0.5 text-[11px]">
            {(["off", "safe", "reels"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGuides(g)}
                title={g === "safe" ? "Action and title safe margins" : g === "reels" ? "Where Instagram's buttons and caption sit" : "No guides"}
                className={`rounded-md px-2 py-1 ${guides === g ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`}
              >
                {g === "off" ? "No guides" : g === "safe" ? "Safe margins" : "Reels UI"}
              </button>
            ))}
          </div>
          <span className="mx-1 h-5 w-px bg-hairline" />
          <button className={`${tool} ${snapping ? "text-accent" : ""}`} onClick={() => setSnapping(!snapping)} title="Snap edges to the playhead and other captions (S)">
            Snap
          </button>
          <button className={tool} onClick={() => zoomBy(1 / 1.6)} title="Zoom out (−)">
            −
          </button>
          <button className={tool} onClick={() => setZoom(0)} title="Fit (\)">
            Fit
          </button>
          <button className={tool} onClick={() => zoomBy(1.6)} title="Zoom in (=)">
            +
          </button>
        </div>
        <Timeline
          lines={lines}
          words={words}
          duration={duration}
          time={time}
          peaks={peaks}
          selected={selected}
          onSelect={(i, extend) => {
            select(i, extend);
            if (tab === "transcript") setTab("captions");
          }}
          tc={tc}
          snapping={snapping}
          range={range}
          onSeek={seek}
          onLive={setWordsRaw}
          onCommit={(base) => {
            setPast((p) => [...p.slice(-199), base]);
            setFuture([]);
          }}
          zoom={zoom}
          setZoom={setZoom}
        />
      </footer>
      )}

      {keysOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setKeysOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold">Keyboard shortcuts</h2>
              <button onClick={() => setKeysOpen(false)} className="text-[13px] text-muted hover:text-foreground">
                Close
              </button>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              {KEYS.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>
                    <kbd className="rounded-md border border-hairline bg-background px-1.5 py-0.5 font-mono text-[11px]">{k}</kbd>
                  </dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {exporting && size && (
        <ExportDialog
          file={project.file}
          size={size}
          duration={duration}
          lines={lines}
          words={words}
          style={style}
          fps={fpsKnown ? fps : undefined}
          simple={mode === "simple"}
          onClose={() => setExporting(false)}
        />
      )}
    </div>
  );
}

function Icon({ d, className = "size-[18px]" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
