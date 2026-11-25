"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deleteWord, editWord, insertAfter, nudge, replaceAll, toggle } from "@/lib/edit";
import { buildLines, type Line } from "@/lib/lines";
import { drawCaptions, lineBudget, loadFonts, type Style } from "@/lib/templates";
import type { Word } from "@/lib/types";
import ExportDialog from "./ExportDialog";
import StylePanel from "./StylePanel";
import type { Project } from "./Studio";

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

export default function Editor({
  project,
  onChange,
  onClose,
}: {
  project: Project;
  onChange: (p: Project) => void;
  onClose: () => void;
}) {
  const [words, setWordsRaw] = useState(project.words);
  const [style, setStyle] = useState(project.style);
  const [past, setPast] = useState<Word[][]>([]);
  const [future, setFuture] = useState<Word[][]>([]);
  const [tab, setTab] = useState<"captions" | "style">("captions");
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  const budget = lineBudget(style);
  const lines = useMemo(() => buildLines(words, budget.maxWords, budget.maxChars), [words, budget.maxWords, budget.maxChars]);

  const setWords = useCallback(
    (next: Word[]) => {
      setPast((p) => [...p.slice(-99), words]);
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

  // Save every change so a refresh reopens the same edit.
  useEffect(() => {
    onChange({ ...project, words, style });
  }, [words, style]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === " " && !typing) {
        e.preventDefault();
        const v = video.current;
        if (v) void (v.paused ? v.play() : v.pause());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Draw the captions over the video every frame.
  const linesRef = useRef<Line[]>(lines);
  const styleRef = useRef<Style>(style);
  useEffect(() => {
    linesRef.current = lines;
    styleRef.current = style;
  }, [lines, style]);
  useEffect(() => {
    let raf = 0;
    let fontsReady = false;
    void loadFonts().then(() => (fontsReady = true));
    const tick = () => {
      const v = video.current;
      const c = canvas.current;
      if (v && c && c.width) {
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, c.width, c.height);
        if (fontsReady) drawCaptions(ctx, c.width, c.height, v.currentTime, linesRef.current, styleRef.current);
        setTime(v.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const seek = (t: number) => {
    if (video.current) video.current.currentTime = Math.max(0, t + 0.001);
  };

  const sel = selected ? words.find((w) => w.id === selected) : undefined;
  const activeLine = lines.findIndex((l) => time >= l.start && time < l.end);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-hairline px-3 sm:px-4">
        <button
          onClick={onClose}
          title="New video"
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground"
        >
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
        <button
          onClick={undo}
          disabled={!past.length}
          title="Undo (⌘Z)"
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground disabled:opacity-30"
        >
          <Icon d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />
        </button>
        <button
          onClick={redo}
          disabled={!future.length}
          title="Redo (⇧⌘Z)"
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-foreground disabled:opacity-30"
        >
          <Icon d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />
        </button>
        <button
          onClick={() => setExporting(true)}
          disabled={!size}
          className="ml-1 flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-accent-ink disabled:opacity-40"
        >
          <Icon d="M12 4v12M6 10l6 6 6-6M4 20h16" className="size-4" />
          Export
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Preview */}
        <section className="flex min-h-0 flex-col items-center justify-center gap-3 bg-black/40 p-4 lg:flex-1">
          <div
            className="relative max-h-[52dvh] max-w-full overflow-hidden rounded-xl bg-black lg:max-h-[calc(100dvh-180px)]"
            style={size ? { aspectRatio: `${size.width} / ${size.height}` } : undefined}
          >
            <video
              ref={video}
              src={project.url}
              playsInline
              className="block h-full max-h-[52dvh] w-full lg:max-h-[calc(100dvh-180px)]"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                const s = { width: v.videoWidth, height: v.videoHeight };
                setSize(s);
                // Preview at most 1080 wide; export uses full size.
                const k = Math.min(1, 1080 / Math.max(s.width, 1));
                if (canvas.current) {
                  canvas.current.width = Math.round(s.width * k);
                  canvas.current.height = Math.round(s.height * k);
                }
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={(e) => void (e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause())}
            />
            <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />
          </div>
          <Timeline
            lines={lines}
            duration={project.duration}
            time={time}
            playing={playing}
            onSeek={seek}
            onToggle={() => {
              const v = video.current;
              if (v) void (v.paused ? v.play() : v.pause());
            }}
          />
        </section>

        {/* Side panel */}
        <aside className="flex min-h-0 flex-1 flex-col border-t border-hairline bg-surface lg:w-[400px] lg:flex-none lg:border-l lg:border-t-0">
          <div className="flex gap-1 border-b border-hairline p-2">
            {(["captions", "style"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-[14px] font-medium capitalize ${
                  tab === t ? "bg-raised text-foreground" : "text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "captions" ? (
              <Captions
                lines={lines}
                activeLine={activeLine}
                selected={sel}
                onSelect={(w) => {
                  setSelected(w?.id ?? null);
                  if (w) seek(w.start);
                }}
                onSeek={seek}
                time={time}
                words={words}
                setWords={setWords}
              />
            ) : (
              <StylePanel style={style} onChange={setStyle} />
            )}
          </div>
        </aside>
      </div>

      {exporting && size && (
        <ExportDialog
          file={project.file}
          size={size}
          duration={project.duration}
          lines={lines}
          words={words}
          style={style}
          onClose={() => setExporting(false)}
        />
      )}
    </div>
  );
}

function Timeline({
  lines,
  duration,
  time,
  playing,
  onSeek,
  onToggle,
}: {
  lines: Line[];
  duration: number;
  time: number;
  playing: boolean;
  onSeek: (t: number) => void;
  onToggle: () => void;
}) {
  const bar = useRef<HTMLDivElement>(null);
  const seekAt = (clientX: number) => {
    const r = bar.current!.getBoundingClientRect();
    onSeek(((clientX - r.left) / r.width) * duration);
  };
  return (
    <div className="flex w-full max-w-3xl items-center gap-3">
      <button
        onClick={onToggle}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[13px] text-black"
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <span className="w-12 shrink-0 text-[12px] tabular-nums text-muted">{fmt(time)}</span>
      <div
        ref={bar}
        className="relative h-9 flex-1 cursor-pointer rounded-lg bg-raised"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seekAt(e.clientX);
        }}
        onPointerMove={(e) => e.buttons && seekAt(e.clientX)}
      >
        {lines.map((l, i) => (
          <div
            key={i}
            className="absolute top-2 bottom-2 rounded-[3px] bg-white/25"
            style={{
              left: `${(l.start / duration) * 100}%`,
              width: `max(2px, calc(${((l.end - l.start) / duration) * 100}% - 1px))`,
            }}
          />
        ))}
        <div className="absolute top-0 bottom-0 w-0.5 bg-accent" style={{ left: `${(time / duration) * 100}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-[12px] tabular-nums text-muted">{fmt(duration)}</span>
    </div>
  );
}

function Captions({
  lines,
  activeLine,
  selected,
  onSelect,
  onSeek,
  time,
  words,
  setWords,
}: {
  lines: Line[];
  activeLine: number;
  selected?: Word;
  onSelect: (w: Word | null) => void;
  onSeek: (t: number) => void;
  time: number;
  words: Word[];
  setWords: (w: Word[]) => void;
}) {
  const [find, setFind] = useState("");
  const [repl, setRepl] = useState("");
  const [note, setNote] = useState("");
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeLine]);

  const matches = find.trim()
    ? words.filter((w) => w.text.toLowerCase().replace(/[?!.,]+$/, "") === find.trim().toLowerCase()).length
    : 0;

  return (
    <div>
      <div className="sticky top-0 z-10 flex gap-2 border-b border-hairline bg-surface p-3">
        <input
          value={find}
          onChange={(e) => {
            setFind(e.target.value);
            setNote("");
          }}
          placeholder="Find word"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-background px-3 py-2 text-[13px] outline-none focus:border-white/25"
        />
        <input
          value={repl}
          onChange={(e) => setRepl(e.target.value)}
          placeholder="Replace with"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-background px-3 py-2 text-[13px] outline-none focus:border-white/25"
        />
        <button
          disabled={!matches}
          onClick={() => {
            const r = replaceAll(words, find, repl);
            setWords(r.words);
            setNote(`Replaced ${r.count}`);
            setFind("");
            setRepl("");
          }}
          className="shrink-0 rounded-lg bg-raised px-3 text-[13px] font-medium disabled:opacity-40"
        >
          {note || (matches ? `Replace ${matches}` : "Replace")}
        </button>
      </div>

      <div className="space-y-1 p-2">
        {lines.map((l, i) => {
          const hasSel = selected && l.words.some((w) => w.id === selected.id);
          return (
            <div
              key={l.words[0].id}
              ref={i === activeLine ? activeRef : undefined}
              className={`rounded-xl px-3 py-2.5 ${i === activeLine ? "bg-raised" : ""}`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onSeek(l.start)}
                  className="mt-[3px] w-10 shrink-0 text-left text-[11px] tabular-nums text-muted hover:text-foreground"
                >
                  {fmt(l.start)}
                </button>
                <div className="flex flex-wrap gap-x-1 gap-y-0.5 text-[15px] leading-relaxed">
                  {l.words.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => onSelect(selected?.id === w.id ? null : w)}
                      className={`rounded px-0.5 ${
                        selected?.id === w.id
                          ? "bg-accent text-accent-ink"
                          : i === activeLine && time >= w.start && time < w.end + 0.08
                            ? "bg-white/15 text-foreground"
                            : w.emphasis
                              ? "text-accent"
                              : i === activeLine || time < l.start
                                ? "hover:bg-white/10"
                                : "text-foreground/60 hover:bg-white/10"
                      }`}
                    >
                      {w.text}
                    </button>
                  ))}
                </div>
              </div>
              {hasSel && selected && (
                <WordTools
                  key={selected.id}
                  word={selected}
                  isLineStart={l.words[0].id === selected.id}
                  onEdit={(text) => setWords(editWord(words, selected.id, text))}
                  onToggle={(k) => setWords(toggle(words, selected.id, k))}
                  onInsert={(text) => setWords(insertAfter(words, selected.id, text))}
                  onDelete={() => {
                    setWords(deleteWord(words, selected.id));
                    onSelect(null);
                  }}
                  onNudge={(d) => setWords(nudge(words, new Set(l.words.map((w) => w.id)), d))}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WordTools({
  word,
  isLineStart,
  onEdit,
  onToggle,
  onInsert,
  onDelete,
  onNudge,
}: {
  word: Word;
  isLineStart: boolean;
  onEdit: (t: string) => void;
  onToggle: (k: "emphasis" | "breakBefore") => void;
  onInsert: (t: string) => void;
  onDelete: () => void;
  onNudge: (d: number) => void;
}) {
  const [text, setText] = useState(word.text);
  const [adding, setAdding] = useState("");
  const btn = "rounded-lg bg-background px-2.5 py-1.5 text-[12px] font-medium hover:bg-white/10";
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-hairline bg-background/60 p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim() !== word.text) onEdit(text);
        }}
        className="flex gap-2"
      >
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text.trim() !== word.text && onEdit(text)}
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent"
        />
        <button type="submit" className="rounded-lg bg-accent px-3 text-[13px] font-semibold text-accent-ink">
          Save
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        <button className={btn} onClick={() => onToggle("emphasis")}>
          {word.emphasis ? "Unhighlight" : "Highlight"}
        </button>
        <button className={btn} onClick={() => onToggle("breakBefore")} disabled={isLineStart && !word.breakBefore}>
          {word.breakBefore ? "Join previous line" : "New line here"}
        </button>
        <button className={btn} onClick={() => onNudge(-0.1)} title="Move this line earlier">
          Line −0.1s
        </button>
        <button className={btn} onClick={() => onNudge(0.1)} title="Move this line later">
          Line +0.1s
        </button>
        <button className={`${btn} text-red-300`} onClick={onDelete}>
          Delete
        </button>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onInsert(adding);
          setAdding("");
        }}
        className="flex gap-2"
      >
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="Add a word after this one"
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-[13px] outline-none focus:border-white/25"
        />
        <button type="submit" disabled={!adding.trim()} className={`${btn} disabled:opacity-40`}>
          Add
        </button>
      </form>
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
