"use client";

import { useEffect, useRef, useState } from "react";
import { deleteCaption, mergeWithNext, replaceAll, setCaptionText, trimEdge } from "@/lib/edit";
import type { Line } from "@/lib/lines";
import type { Style } from "@/lib/templates";
import type { Word } from "@/lib/types";
import { clock, parseClock } from "./time";

/**
 * Premiere's Captions panel: every caption with its in and out points and its text, all
 * editable in place, plus the rules that decide how speech is broken into captions.
 */
export default function CaptionList({
  lines,
  words,
  setWords,
  selected,
  onSelect,
  activeLine,
  onSeek,
  style,
  setStyle,
  onFix,
}: {
  lines: Line[];
  words: Word[];
  setWords: (w: Word[]) => void;
  selected: number;
  onSelect: (i: number) => void;
  activeLine: number;
  onSeek: (t: number) => void;
  style: Style;
  setStyle: (s: Style) => void;
  onFix: (pairs: { before: string; after: string }[]) => void;
}) {
  const [find, setFind] = useState("");
  const [repl, setRepl] = useState("");
  const [note, setNote] = useState("");
  const [rules, setRules] = useState(false);
  const activeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeLine, selected]);

  const needle = find.trim().toLowerCase();
  const matches = needle ? words.filter((w) => w.text.toLowerCase().replace(/[?!.,]+$/, "") === needle).length : 0;
  const hits = needle ? new Set(lines.map((l, i) => (l.words.some((w) => w.text.toLowerCase().includes(needle)) ? i : -1)).filter((i) => i >= 0)) : null;

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
        <div className="flex items-center justify-between text-[12px] text-muted">
          <span>
            {lines.length} captions{hits ? ` · ${hits.size} match` : ""}
          </span>
          <button onClick={() => setRules(!rules)} className="rounded-md px-2 py-1 hover:bg-white/5 hover:text-foreground">
            {rules ? "Hide" : "Caption"} rules
          </button>
        </div>
        {rules && <Rules style={style} setStyle={setStyle} />}
      </div>

      <div className="divide-y divide-hairline">
        {lines.map((l, i) => {
          if (hits && !hits.has(i)) return null;
          const on = i === selected;
          const live = i === activeLine;
          return (
            <div
              key={l.words[0].id}
              ref={on || (selected < 0 && live) ? activeRef : undefined}
              onClick={() => onSelect(i)}
              className={`grid grid-cols-[28px_1fr] gap-x-2 px-3 py-2.5 ${on ? "bg-accent/10" : live ? "bg-white/[0.04]" : ""}`}
            >
              <span className={`pt-1 text-[11px] tabular-nums ${live ? "text-accent" : "text-muted"}`}>{i + 1}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-muted">
                  <TimeField
                    value={l.start}
                    onCommit={(t) => setWords(trimEdge(words, l, "in", t, lines[i - 1], lines[i + 1]))}
                    onFocus={() => onSeek(l.start)}
                  />
                  <span>→</span>
                  <TimeField value={l.end} onCommit={(t) => setWords(trimEdge(words, l, "out", t, lines[i - 1], lines[i + 1]))} onFocus={() => onSeek(Math.max(l.start, l.end - 0.05))} />
                  <span className="ml-1">{(l.end - l.start).toFixed(2)}s</span>
                  <span className="flex-1" />
                  {on && (
                    <>
                      <Mini title="Join with the next caption (M)" disabled={i === lines.length - 1} onClick={() => setWords(mergeWithNext(words, l, lines[i + 1]))}>
                        Merge ↓
                      </Mini>
                      <Mini title="Delete caption (⌫)" danger onClick={() => setWords(deleteCaption(words, l))}>
                        Delete
                      </Mini>
                    </>
                  )}
                </div>
                <CaptionText
                  line={l}
                  onCommit={(text) => {
                    const before = l.words.map((w) => w.text);
                    const after = text.trim().split(/\s+/);
                    setWords(setCaptionText(words, l, text));
                    // Same number of words: each changed word is a spelling fix worth learning.
                    if (before.length === after.length) onFix(before.map((b, k) => ({ before: b, after: after[k] })).filter((p) => p.before !== p.after));
                  }}
                  onFocus={() => {
                    onSelect(i);
                    onSeek(l.start);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CaptionText({ line, onCommit, onFocus }: { line: Line; onCommit: (t: string) => void; onFocus: () => void }) {
  const text = line.words.map((w) => w.text).join(" ");
  const [draft, setDraft] = useState(text);
  const [prev, setPrev] = useState(text);
  if (prev !== text) {
    setPrev(text);
    setDraft(text);
  }
  return (
    <textarea
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
        if (e.key === "Escape") {
          setDraft(text);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className="mt-1 w-full resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[15px] leading-snug outline-none hover:border-hairline focus:border-accent focus:bg-background"
    />
  );
}

function TimeField({ value, onCommit, onFocus }: { value: number; onCommit: (t: number) => void; onFocus: () => void }) {
  const shown = clock(value);
  const [draft, setDraft] = useState<string | null>(null);
  const done = () => {
    if (draft === null) return;
    const t = parseClock(draft);
    setDraft(null);
    if (t !== null && Math.abs(t - value) > 0.005) onCommit(t);
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
        // Nudge by a frame (or ⇧ ten frames) with the arrow keys, like a timecode field.
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          const step = (e.shiftKey ? 10 : 1) / 30;
          onCommit(Math.max(0, value + (e.key === "ArrowUp" ? step : -step)));
        }
      }}
      className="w-[62px] rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] tabular-nums outline-none hover:border-hairline focus:border-accent focus:bg-background focus:text-foreground"
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

/** Like Premiere's "Create captions" settings; changing them re-flows every caption live. */
function Rules({ style, setStyle }: { style: Style; setStyle: (s: Style) => void }) {
  const row = "flex items-center justify-between gap-3";
  const num = (v: number, set: (n: number) => void, min: number, max: number, step: number, unit = "") => (
    <span className="flex items-center gap-1.5">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => set(Number(e.target.value))}
        className="w-28 accent-[var(--accent)]"
      />
      <span className="w-12 text-right tabular-nums text-foreground">
        {v}
        {unit}
      </span>
    </span>
  );
  return (
    <div className="space-y-2.5 rounded-xl border border-hairline bg-background/60 p-3 text-[12px] text-muted">
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
            <button
              key={String(stack)}
              onClick={() => setStyle({ ...style, stack })}
              className={`rounded-md px-2 py-0.5 ${style.stack === stack ? "bg-white/10 text-foreground" : "hover:text-foreground"}`}
            >
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
    </div>
  );
}
