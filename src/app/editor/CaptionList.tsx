"use client";

import { useEffect, useRef, useState } from "react";
import { closeGaps, deleteCaptions, mergeCaptions, replaceAll, setCaptionText, shiftWords, trimEdge } from "@/lib/edit";
import type { Line } from "@/lib/lines";
import type { Issue, QcRules } from "@/lib/qc";
import type { Style } from "@/lib/templates";
import type { Word } from "@/lib/types";
import { formatTime, parseTime, type Timecode } from "./time";

/**
 * Premiere's Captions panel, plus the checks a subtitle QC pass would make: every caption with
 * its in and out points and its text, all editable in place; shift-click to act on a range.
 */
export default function CaptionList({
  lines,
  words,
  setWords,
  selected,
  range,
  onSelect,
  activeLine,
  onSeek,
  style,
  setStyle,
  onFix,
  tc,
  issues,
  qc,
  setQc,
}: {
  lines: Line[];
  words: Word[];
  setWords: (w: Word[]) => void;
  selected: number;
  /** The selected run of captions, first and last index. */
  range: [number, number] | null;
  onSelect: (i: number, extend?: boolean) => void;
  activeLine: number;
  onSeek: (t: number) => void;
  style: Style;
  setStyle: (s: Style) => void;
  onFix: (pairs: { before: string; after: string }[]) => void;
  tc: Timecode;
  issues: Issue[][];
  qc: QcRules;
  setQc: (q: QcRules) => void;
}) {
  const [find, setFind] = useState("");
  const [repl, setRepl] = useState("");
  const [note, setNote] = useState("");
  const [panel, setPanel] = useState<"none" | "rules" | "sync">("none");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const activeRef = useRef<HTMLDivElement>(null);
  const texts = useRef<(HTMLTextAreaElement | null)[]>([]);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeLine, selected]);

  const needle = find.trim().toLowerCase();
  const matches = needle ? words.filter((w) => w.text.toLowerCase().replace(/[?!.,]+$/, "") === needle).length : 0;
  const hits = needle ? new Set(lines.map((l, i) => (l.words.some((w) => w.text.toLowerCase().includes(needle)) ? i : -1)).filter((i) => i >= 0)) : null;
  const flagged = issues.reduce((n, x) => n + (x.length ? 1 : 0), 0);
  const inRange = (i: number) => !!range && i >= range[0] && i <= range[1];
  const many = range && range[1] > range[0] ? lines.slice(range[0], range[1] + 1) : null;

  /** Tab / Shift-Tab from a caption's text goes to the next or previous one, like Premiere. */
  const jump = (i: number) => {
    const t = texts.current[i];
    if (!t) return;
    t.focus();
    t.setSelectionRange(t.value.length, t.value.length);
  };

  return (
    <div>
      <div className="sticky top-0 z-10 space-y-2 border-b border-hairline bg-surface p-3">
        <div className="flex gap-2">
          <input
            value={find}
            onChange={(e) => {
              setFind(e.target.value);
              setNote("");
            }}
            placeholder="Search captions"
            className="min-w-0 flex-1 rounded-lg border border-hairline bg-background px-3 py-2 text-[13px] outline-none focus:border-white/25"
          />
          <input
            value={repl}
            onChange={(e) => setRepl(e.target.value)}
            placeholder="Replace word with"
            className="min-w-0 flex-1 rounded-lg border border-hairline bg-background px-3 py-2 text-[13px] outline-none focus:border-white/25"
          />
          <button
            disabled={!matches}
            onClick={() => {
              const r = replaceAll(words, find, repl);
              setWords(r.words);
              if (r.count && !/\s/.test(repl.trim())) onFix([{ before: find.trim(), after: repl.trim() }]);
              setNote(`Replaced ${r.count}`);
              setFind("");
              setRepl("");
            }}
            className="shrink-0 rounded-lg bg-raised px-3 text-[13px] font-medium disabled:opacity-40"
          >
            {note || (matches ? `Replace ${matches}` : "Replace")}
          </button>
        </div>
        <div className="flex items-center gap-1 text-[12px] text-muted">
          <span className="mr-1">
            {lines.length} captions{hits ? ` · ${hits.size} match` : ""}
          </span>
          <button
            onClick={() => setOnlyIssues(!onlyIssues)}
            disabled={!flagged && !onlyIssues}
            title="Reading speed, duration, length and flicker checks"
            className={`rounded-md px-2 py-1 ${onlyIssues ? "bg-amber-400/15 text-amber-200" : flagged ? "text-amber-200/90 hover:bg-white/5" : "opacity-50"}`}
          >
            {flagged ? `${flagged} to check` : "No issues"}
          </button>
          <span className="flex-1" />
          {(["sync", "rules"] as const).map((p) => (
            <button key={p} onClick={() => setPanel(panel === p ? "none" : p)} className={`rounded-md px-2 py-1 hover:bg-white/5 hover:text-foreground ${panel === p ? "bg-white/10 text-foreground" : ""}`}>
              {p === "sync" ? "Timing tools" : "Rules"}
            </button>
          ))}
        </div>
        {panel === "rules" && <Rules style={style} setStyle={setStyle} qc={qc} setQc={setQc} />}
        {panel === "sync" && <TimingTools words={words} lines={lines} setWords={setWords} tc={tc} gap={style.gap ?? 0} />}
        {many && (
          <div className="flex items-center gap-1 rounded-lg bg-accent/10 px-2 py-1.5 text-[12px]">
            <span className="mr-1 font-medium">{many.length} selected</span>
            <Mini title="Join into one caption" onClick={() => setWords(mergeCaptions(words, many))}>
              Merge
            </Mini>
            <Mini title="Move these a frame earlier" onClick={() => setWords(shiftWords(words, -1 / tc.fps, new Set(many.flatMap((l) => l.words.map((w) => w.id)))))}>
              −1f
            </Mini>
            <Mini title="Move these a frame later" onClick={() => setWords(shiftWords(words, 1 / tc.fps, new Set(many.flatMap((l) => l.words.map((w) => w.id)))))}>
              +1f
            </Mini>
            <span className="flex-1" />
            <Mini title="Delete these captions" danger onClick={() => setWords(deleteCaptions(words, many))}>
              Delete
            </Mini>
          </div>
        )}
      </div>

      <div className="divide-y divide-hairline">
        {lines.map((l, i) => {
          if (hits && !hits.has(i)) return null;
          if (onlyIssues && !issues[i]?.length) return null;
          const on = i === selected || inRange(i);
          const live = i === activeLine;
          return (
            <div
              key={l.words[0].id}
              ref={i === selected || (selected < 0 && live) ? activeRef : undefined}
              onClick={(e) => onSelect(i, e.shiftKey)}
              className={`grid grid-cols-[28px_1fr] gap-x-2 px-3 py-2.5 ${on ? "bg-accent/10" : live ? "bg-white/[0.04]" : ""}`}
            >
              <span className={`pt-1 text-[11px] tabular-nums ${live ? "text-accent" : "text-muted"}`}>{i + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[11px] tabular-nums text-muted">
                  <TimeField value={l.start} tc={tc} onCommit={(t) => setWords(trimEdge(words, l, "in", t, lines[i - 1], lines[i + 1]))} onFocus={() => onSeek(l.start)} />
                  <span>→</span>
                  <TimeField value={l.end} tc={tc} onCommit={(t) => setWords(trimEdge(words, l, "out", t, lines[i - 1], lines[i + 1]))} onFocus={() => onSeek(Math.max(l.start, l.end - 0.05))} />
                  <span className="ml-1">{tc.mode === "frames" ? `${Math.round((l.end - l.start) * tc.fps)}f` : `${(l.end - l.start).toFixed(2)}s`}</span>
                  <span className="flex-1" />
                  {i === selected && !many && (
                    <>
                      <Mini title="Join with the next caption (M)" disabled={i === lines.length - 1} onClick={() => setWords(mergeCaptions(words, [l, lines[i + 1]]))}>
                        Merge ↓
                      </Mini>
                      <Mini title="Delete caption (⌫)" danger onClick={() => setWords(deleteCaptions(words, [l]))}>
                        Delete
                      </Mini>
                    </>
                  )}
                </div>
                <CaptionText
                  line={l}
                  ref={(el) => {
                    texts.current[i] = el;
                  }}
                  onCommit={(text) => {
                    const before = l.words.map((w) => w.text);
                    const after = text.trim().split(/\s+/);
                    setWords(setCaptionText(words, l, text));
                    if (before.length === after.length) onFix(before.map((b, k) => ({ before: b, after: after[k] })).filter((p) => p.before !== p.after));
                  }}
                  onFocus={() => {
                    onSelect(i);
                    onSeek(l.start);
                  }}
                  onTab={(back) => jump(i + (back ? -1 : 1))}
                />
                {issues[i]?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {issues[i].map((x) => (
                      <span key={x.kind} title={x.detail} className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
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
  );
}

function CaptionText({
  line,
  ref,
  onCommit,
  onFocus,
  onTab,
}: {
  line: Line;
  ref: (el: HTMLTextAreaElement | null) => void;
  onCommit: (t: string) => void;
  onFocus: () => void;
  onTab: (back: boolean) => void;
}) {
  const text = line.words.map((w) => w.text).join(" ");
  const [draft, setDraft] = useState(text);
  const [prev, setPrev] = useState(text);
  if (prev !== text) {
    setPrev(text);
    setDraft(text);
  }
  return (
    <textarea
      ref={ref}
      dir="auto"
      value={draft}
      rows={Math.max(1, Math.ceil(draft.length / 38))}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={onFocus}
      onBlur={() => draft.trim() !== text && onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
        if (e.key === "Tab") {
          e.preventDefault();
          if (draft.trim() !== text) onCommit(draft);
          onTab(e.shiftKey);
        }
        if (e.key === "Escape") {
          setDraft(text);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className="mt-1 w-full resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[15px] leading-snug outline-none hover:border-hairline focus:border-accent focus:bg-background"
    />
  );
}

function TimeField({ value, tc, onCommit, onFocus }: { value: number; tc: Timecode; onCommit: (t: number) => void; onFocus: () => void }) {
  const shown = formatTime(value, tc);
  const [draft, setDraft] = useState<string | null>(null);
  const done = () => {
    if (draft === null) return;
    const raw = draft.trim();
    setDraft(null);
    // "+3" / "-2" nudge by frames, like typing an offset into a timecode field.
    const nudge = raw.match(/^([+-])(\d+)f?$/);
    const t = nudge ? value + (nudge[1] === "-" ? -1 : 1) * (Number(nudge[2]) / tc.fps) : parseTime(raw, tc);
    if (t !== null && Math.abs(t - value) > 0.0005) onCommit(Math.max(0, t));
  };
  return (
    <input
      value={draft ?? shown}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => {
        onFocus();
        e.target.select();
      }}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(null);
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const step = (e.shiftKey ? 10 : 1) / tc.fps;
          onCommit(Math.max(0, value + (e.key === "ArrowUp" ? step : -step)));
        }
      }}
      title="Type a time, or +3 / −3 to nudge by frames. ↑↓ steps a frame, ⇧ ten."
      className={`${tc.mode === "frames" ? "w-[78px]" : "w-[62px]"} rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] tabular-nums outline-none hover:border-hairline focus:border-accent focus:bg-background focus:text-foreground`}
    />
  );
}

function Mini({ children, onClick, title, danger, disabled }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-white/10 disabled:opacity-30 ${danger ? "text-red-300" : "text-foreground/80"}`}
    >
      {children}
    </button>
  );
}

/** Whole-project timing fixes: sync offset and gap closing. */
function TimingTools({ words, lines, setWords, tc, gap }: { words: Word[]; lines: Line[]; setWords: (w: Word[]) => void; tc: Timecode; gap: number }) {
  const [frames, setFrames] = useState(2);
  const [maxGap, setMaxGap] = useState(0.5);
  const btn = "rounded-md bg-raised px-2 py-1 text-foreground hover:bg-white/10";
  return (
    <div className="space-y-3 rounded-xl border border-hairline bg-background/60 p-3 text-[12px] text-muted">
      <div>
        <div className="mb-1.5">Sync: move every caption</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="number"
            min={1}
            value={frames}
            onChange={(e) => setFrames(Math.max(1, Number(e.target.value) || 1))}
            className="h-7 w-14 rounded-md border border-hairline bg-surface px-2 text-foreground outline-none"
          />
          <span>frames</span>
          <button className={btn} onClick={() => setWords(shiftWords(words, -frames / tc.fps))}>
            Earlier
          </button>
          <button className={btn} onClick={() => setWords(shiftWords(words, frames / tc.fps))}>
            Later
          </button>
        </div>
      </div>
      <div>
        <div className="mb-1.5">Close gaps shorter than</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <select value={maxGap} onChange={(e) => setMaxGap(Number(e.target.value))} className="h-7 rounded-md border border-hairline bg-surface px-2 text-foreground outline-none">
            {[0.25, 0.5, 1, 2].map((g) => (
              <option key={g} value={g}>
                {g} s
              </option>
            ))}
          </select>
          <button className={btn} onClick={() => setWords(closeGaps(words, lines, maxGap, gap))}>
            Close gaps
          </button>
        </div>
        <p className="mt-1.5 text-[11px]">Holds each caption until the next one, keeping the gap set in Rules. Stops flicker between lines.</p>
      </div>
    </div>
  );
}

/** Like Premiere's "Create captions" settings, plus the limits the quality checks use. */
function Rules({ style, setStyle, qc, setQc }: { style: Style; setStyle: (s: Style) => void; qc: QcRules; setQc: (q: QcRules) => void }) {
  const row = "flex items-center justify-between gap-3";
  const num = (v: number, set: (n: number) => void, min: number, max: number, step: number, unit = "") => (
    <span className="flex items-center gap-1.5">
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} className="w-28 accent-[var(--accent)]" />
      <span className="w-12 text-right tabular-nums text-foreground">
        {v}
        {unit}
      </span>
    </span>
  );
  return (
    <div className="space-y-2.5 rounded-xl border border-hairline bg-background/60 p-3 text-[12px] text-muted">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em]">Splitting</div>
      <div className={row}>
        <span>Words per caption</span>
        {num(style.wordsPerLine, (wordsPerLine) => setStyle({ ...style, wordsPerLine }), 1, 12, 1)}
      </div>
      <div className={row}>
        <span>Max characters</span>
        {style.maxChars > 0 ? (
          num(style.maxChars, (maxChars) => setStyle({ ...style, maxChars }), 8, 84, 1)
        ) : (
          <button onClick={() => setStyle({ ...style, maxChars: 32 })} className="rounded-md px-2 py-0.5 text-foreground hover:bg-white/10">
            Auto · set
          </button>
        )}
      </div>
      <div className={row}>
        <span>Minimum duration</span>
        {num(style.minDuration ?? 0, (minDuration) => setStyle({ ...style, minDuration }), 0, 3, 0.1, "s")}
      </div>
      <div className={row}>
        <span>Gap between captions</span>
        {num(style.gap ?? 0, (gap) => setStyle({ ...style, gap }), 0, 0.5, 0.01, "s")}
      </div>
      <div className={row}>
        <span>Lines</span>
        <span className="flex gap-1">
          {([false, true] as const).map((stack) => (
            <button key={String(stack)} onClick={() => setStyle({ ...style, stack })} className={`rounded-md px-2 py-0.5 ${style.stack === stack ? "bg-white/10 text-foreground" : "hover:text-foreground"}`}>
              {stack ? "One word per line" : "Wrap to fit"}
            </button>
          ))}
        </span>
      </div>
      {style.maxChars > 0 && (
        <button onClick={() => setStyle({ ...style, maxChars: 0 })} className="text-[11px] underline-offset-2 hover:text-foreground hover:underline">
          Reset max characters to auto
        </button>
      )}
      <div className="pt-1 font-mono text-[10px] uppercase tracking-[0.12em]">Checks</div>
      <div className={row}>
        <span>Max reading speed</span>
        {num(qc.maxCps, (maxCps) => setQc({ ...qc, maxCps }), 10, 30, 1, " cps")}
      </div>
      <div className={row}>
        <span>Shortest caption</span>
        {num(Number(qc.minDuration.toFixed(2)), (minDuration) => setQc({ ...qc, minDuration }), 0.3, 2, 0.05, "s")}
      </div>
      <div className={row}>
        <span>Longest caption</span>
        {num(qc.maxDuration, (maxDuration) => setQc({ ...qc, maxDuration }), 3, 12, 0.5, "s")}
      </div>
      <div className={row}>
        <span>Character limit</span>
        {num(qc.maxChars, (maxChars) => setQc({ ...qc, maxChars }), 16, 84, 1)}
      </div>
    </div>
  );
}
