"use client";

import { useRef, useState } from "react";
import { download, exportBurnedIn, exportOverlay, exportPngSequence } from "@/lib/export";
import { minutesLabel, RUPEES_PER_MINUTE } from "@/lib/pricing";
import { toAss, toSrt, toText, toVtt, type Line, type SubOptions } from "@/lib/lines";
import { fontMeta } from "@/lib/fonts";
import type { Style } from "@/lib/templates";
import type { Word } from "@/lib/types";

type Kind = "mp4" | "png" | "green" | "alpha" | "srt" | "ass" | "vtt" | "txt";

const POST: { kind: Kind; title: string; sub: string }[] = [{ kind: "mp4", title: "Video with captions", sub: "MP4 with your audio, ready to post" }];

const EDIT: { kind: Kind; title: string; sub: string }[] = [
  { kind: "srt", title: "SRT", sub: "Imports as a caption track in Premiere, Resolve and Final Cut" },
  { kind: "png", title: "Transparent PNG sequence", sub: "Styled captions with alpha, as a zip. Works in every editor" },
  { kind: "green", title: "Green screen MP4", sub: "Styled captions on #00FF00, to key out" },
  { kind: "alpha", title: "Transparent WebM", sub: "VP9 alpha, for CapCut, OBS and the web" },
  { kind: "ass", title: "ASS karaoke", sub: "Words light up as they are said. For VLC, mpv, Aegisub and ffmpeg" },
  { kind: "vtt", title: "VTT", sub: "For web players" },
  { kind: "txt", title: "Transcript", sub: "Plain text" },
];

const RATES = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60];

export default function ExportDialog({
  file,
  size,
  duration,
  lines,
  words,
  style,
  fps: sourceFps,
  simple,
  paid = true,
  beforeExport,
  onClose,
}: {
  file: File;
  size: { width: number; height: number };
  duration: number;
  lines: Line[];
  words: Word[];
  style: Style;
  /** The video's own frame rate, when known. */
  fps?: number;
  /** Non-editors see just the video and SRT. */
  simple?: boolean;
  /** Already paid for (or nothing to pay): no price note. */
  paid?: boolean;
  /** Pays for the video at its first export; false stops the export. */
  beforeExport?: () => Promise<boolean>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<Kind | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fps, setFps] = useState(() => RATES.reduce((a, b) => (Math.abs(b - (sourceFps ?? 30)) < Math.abs(a - (sourceFps ?? 30)) ? b : a)));
  const [wrap, setWrap] = useState<"none" | "42" | "32">("none");
  const abort = useRef<AbortController | null>(null);
  const base = file.name.replace(/\.[^.]+$/, "");
  const sub: SubOptions = wrap === "none" ? {} : { maxLineChars: Number(wrap), maxLines: 2 };

  async function run(kind: Kind) {
    setError("");
    try {
      if (beforeExport && !(await beforeExport())) return;
    } catch (err) {
      return setError(err instanceof Error ? err.message : "Couldn't start the export.");
    }
    if (kind === "ass") {
      // The file uses the editor's look: colours, font, size and position.
      const text = toAss(lines, {
        width: size.width,
        height: size.height,
        fontName: fontMeta(style.font).name,
        fontSize: style.size * size.width,
        bold: style.weight >= 700,
        textColor: style.textColor,
        highlightColor: style.highlightColor,
        outlineColor: style.outlineColor,
        outlineWidth: style.outlineWidth * style.size * size.width,
        y: style.y,
      });
      download(new Blob([text], { type: "text/plain" }), `${base}.ass`);
      return;
    }
    if (kind === "srt" || kind === "vtt" || kind === "txt") {
      const text = kind === "srt" ? toSrt(lines, sub) : kind === "vtt" ? toVtt(lines, sub) : toText(words);
      download(new Blob([text], { type: "text/plain" }), `${base}.${kind}`);
      return;
    }
    setBusy(kind);
    setProgress(0);
    abort.current = new AbortController();
    const signal = abort.current.signal;
    try {
      const blob =
        kind === "mp4"
          ? await exportBurnedIn(file, size, lines, style, setProgress, signal)
          : kind === "png"
            ? await exportPngSequence(duration, size, lines, style, setProgress, signal, fps, `${base}-captions`)
            : await exportOverlay(kind, duration, size, lines, style, setProgress, signal, fps);
      const name =
        kind === "mp4" ? `${base}-captions.mp4` : kind === "png" ? `${base}-captions-${fps}fps.zip` : kind === "alpha" ? `${base}-captions.webm` : `${base}-greenscreen.mp4`;
      download(blob, name);
    } catch (err) {
      if (!signal.aborted) {
        console.error(err);
        setError(
          kind === "alpha"
            ? "This browser can't make transparent video. Try Chrome, or use the PNG sequence."
            : err instanceof Error
              ? err.message
              : "Export failed.",
        );
      }
    } finally {
      setBusy(null);
    }
  }

  const all = simple ? [...POST, EDIT[0]] : null;
  const row = (o: { kind: Kind; title: string; sub: string }) => (
    <button key={o.kind} onClick={() => run(o.kind)} className="flex w-full flex-col rounded-xl bg-raised px-4 py-3 text-left hover:bg-white/10">
      <span className="text-[14px] font-semibold">{o.title}</span>
      <span className="text-[12px] text-muted">{o.sub}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" onClick={() => !busy && onClose()}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-hairline bg-surface p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-semibold">Export</h2>
            {!paid && (
              <p className="mt-0.5 text-[12px] text-muted">
                Your first export uses {minutesLabel(duration)} of credit (₹{Math.max(1, Math.round((duration / 60) * RUPEES_PER_MINUTE))}). Every export after that is free.
              </p>
            )}
          </div>
          {!busy && (
            <button onClick={onClose} className="text-[14px] text-muted">
              Close
            </button>
          )}
        </div>
        {busy ? (
          <div className="py-8">
            <div className="text-[14px]">{[...POST, ...EDIT].find((o) => o.kind === busy)?.title}</div>
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
        ) : all ? (
          <div className="mt-4 space-y-1.5">
            {all.map(row)}
            {error && <p className="pt-2 text-[13px] text-red-300">{error}</p>}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">{POST.map(row)}</div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">For your editor</h3>
                <span className="text-[11px] text-muted">
                  {size.width}×{size.height}
                </span>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-2 text-[12px]">
                <label className="block">
                  <span className="text-muted">Frame rate</span>
                  <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className="mt-1 h-9 w-full rounded-lg border border-hairline bg-background px-2 outline-none">
                    {RATES.map((r) => (
                      <option key={r} value={r}>
                        {r} fps{sourceFps && Math.abs(r - sourceFps) < 0.05 ? " · source" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-muted">Subtitle lines</span>
                  <select value={wrap} onChange={(e) => setWrap(e.target.value as typeof wrap)} className="mt-1 h-9 w-full rounded-lg border border-hairline bg-background px-2 outline-none">
                    <option value="none">One line each</option>
                    <option value="42">2 lines, 42 characters</option>
                    <option value="32">2 lines, 32 characters</option>
                  </select>
                </label>
              </div>
              <div className="space-y-1.5">{EDIT.map(row)}</div>
            </div>
            {error && <p className="text-[13px] text-red-300">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
