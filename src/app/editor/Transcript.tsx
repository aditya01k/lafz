"use client";

import { useEffect, useRef, useState } from "react";
import { deleteWord, editWord, insertAfter, nudge, toggle } from "@/lib/edit";
import type { Line } from "@/lib/lines";
import type { Word } from "@/lib/types";
import { clock } from "./time";

/**
 * Word by word: fix a spelling, highlight a word, start a new caption at a word, or add one
 * that was missed. Fixes can be shared (words only) to help lafz spell better.
 */
export default function Transcript({
  lines,
  activeLine,
  selected,
  onSelect,
  onSeek,
  time,
  words,
  setWords,
  onFix,
}: {
  lines: Line[];
  activeLine: number;
  selected?: Word;
  onSelect: (w: Word | null) => void;
  onSeek: (t: number) => void;
  time: number;
  words: Word[];
  setWords: (w: Word[]) => void;
  onFix: (pairs: { before: string; after: string }[]) => void;
}) {
  const [share, setShare] = useState(true);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
      setShare(localStorage.getItem("lafz:share-fixes") !== "0");
    } catch {}
  }, []);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeLine]);

  return (
    <div>
      <p className="border-b border-hairline px-4 py-3 text-[12px] text-muted">Click a word to fix it, highlight it, or start a new caption there.</p>
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
                  {clock(l.start)}
                </button>
                <div dir="auto" className="flex flex-wrap gap-x-1 gap-y-0.5 text-[15px] leading-relaxed">
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
                  onEdit={(text) => {
                    setWords(editWord(words, selected.id, text));
                    if (!/\s/.test(text.trim())) onFix([{ before: selected.text, after: text.trim() }]);
                  }}
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
      <label className="flex items-start gap-2 border-t border-hairline px-4 py-3 text-[11px] leading-relaxed text-muted">
        <input
          type="checkbox"
          checked={share}
          onChange={(e) => {
            setShare(e.target.checked);
            try {
              localStorage.setItem("lafz:share-fixes", e.target.checked ? "1" : "0");
            } catch {}
          }}
          className="mt-0.5 accent-[var(--accent)]"
        />
        Share my word fixes to help lafz spell better for everyone. Only the corrected words are sent, never your video or audio.
      </label>
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

