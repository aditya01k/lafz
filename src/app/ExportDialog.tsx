"use client";

import { useRef, useState } from "react";
import { download, exportBurnedIn, exportOverlay } from "@/lib/export";
import { toSrt, toText, toVtt, type Line } from "@/lib/lines";
import type { Style } from "@/lib/templates";
import type { Word } from "@/lib/types";

type Kind = "mp4" | "green" | "alpha" | "srt" | "vtt" | "txt";

const OPTIONS: { kind: Kind; title: string; sub: string }[] = [
  { kind: "mp4", title: "Video with captions", sub: "MP4, ready to post" },
  { kind: "alpha", title: "Transparent captions", sub: "WebM with alpha, for Premiere, DaVinci, Final Cut" },
  { kind: "green", title: "Green screen captions", sub: "MP4 on #00FF00, for any editor" },
  { kind: "srt", title: "SRT subtitles", sub: "For YouTube and most editors" },
  { kind: "vtt", title: "VTT subtitles", sub: "For web players" },
  { kind: "txt", title: "Transcript", sub: "Plain text" },
];

export default function ExportDialog({
  file,
  size,
  duration,
  lines,
  words,
  style,
  onClose,
}: {
  file: File;
  size: { width: number; height: number };
  duration: number;
  lines: Line[];
  words: Word[];
  style: Style;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const base = file.name.replace(/\.[^.]+$/, "");

  async function run(kind: Kind) {
    setError("");
    if (kind === "srt" || kind === "vtt" || kind === "txt") {
      const text = kind === "srt" ? toSrt(lines) : kind === "vtt" ? toVtt(lines) : toText(words);
      download(new Blob([text], { type: "text/plain" }), `${base}.${kind}`);
      return;
    }
    setBusy(kind);
    setProgress(0);
    abort.current = new AbortController();
    try {
      const blob =
        kind === "mp4"
          ? await exportBurnedIn(file, size, lines, style, setProgress, abort.current.signal)
          : await exportOverlay(kind, duration, size, lines, style, setProgress, abort.current.signal);
      download(blob, kind === "mp4" ? `${base}-captions.mp4` : kind === "alpha" ? `${base}-captions.webm` : `${base}-greenscreen.mp4`);
    } catch (err) {
      if (!abort.current.signal.aborted) {
        console.error(err);
        setError(
          kind === "alpha"
            ? "This browser can't make transparent video. Try Chrome, or use green screen."
            : err instanceof Error
              ? err.message
              : "Export failed.",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-md rounded-t-2xl border border-hairline bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Export</h2>
          {!busy && (
            <button onClick={onClose} className="text-[14px] text-muted">
              Close
            </button>
          )}
        </div>
        {busy ? (
          <div className="py-8">
            <div className="text-[14px]">{OPTIONS.find((o) => o.kind === busy)?.title}</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-raised">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-muted">
              <span>{Math.round(progress * 100)}% · keep this tab open</span>
              <button onClick={() => abort.current?.abort()} className="hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-1.5">
            {OPTIONS.map((o) => (
              <button key={o.kind} onClick={() => run(o.kind)} className="flex w-full flex-col rounded-xl bg-raised px-4 py-3 text-left hover:bg-white/10">
                <span className="text-[14px] font-semibold">{o.title}</span>
                <span className="text-[12px] text-muted">{o.sub}</span>
              </button>
            ))}
            {error && <p className="pt-2 text-[13px] text-red-300">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
