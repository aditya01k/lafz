import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  WebMOutputFormat,
} from "mediabunny";
import type { Line } from "./lines";
import { drawCaptions, loadFonts, type Style } from "./templates";

const allText = (lines: Line[]) => lines.flatMap((l) => l.words.map((w) => w.text)).join(" ");

/**
 * Exports run in the browser (WebCodecs via Mediabunny), so rendering costs us
 * nothing per video. That's what keeps the half-price plans profitable.
 */

type Progress = (p: number) => void;

/** Burns captions into the original video, keeping its audio untouched. */
export async function exportBurnedIn(
  file: File,
  size: { width: number; height: number },
  lines: Line[],
  style: Style,
  onProgress: Progress,
  signal?: AbortSignal,
): Promise<Blob> {
  await loadFonts(style, allText(lines));
  const { width, height } = even(size);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const conversion = await Conversion.init({
    input,
    output,
    video: {
      forceTranscode: true,
      codec: "avc",
      bitrate: bitrateFor(width, height),
      processedWidth: width,
      processedHeight: height,
      process: (sample) => {
        sample.drawWithFit(ctx, { fit: "fill" });
        drawCaptions(ctx, width, height, sample.timestamp, lines, style);
        return canvas;
      },
    },
  });
  if (!conversion.isValid) throw new Error("This browser can't re-encode this video. Try Chrome on a computer.");
  conversion.onProgress = onProgress;
  signal?.addEventListener("abort", () => void conversion.cancel());
  await conversion.execute();
  return new Blob([(output.target as BufferTarget).buffer!], { type: "video/mp4" });
}

/**
 * Captions alone, for editors: on green (MP4, any editor can key it) or on
 * transparency (WebM with VP9 alpha, for Premiere/DaVinci/Final Cut).
 */
export async function exportOverlay(
  mode: "green" | "alpha",
  duration: number,
  size: { width: number; height: number },
  lines: Line[],
  style: Style,
  onProgress: Progress,
  signal?: AbortSignal,
): Promise<Blob> {
  await loadFonts(style, allText(lines));
  const { width, height } = even(size);
  const fps = 30;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { alpha: mode === "alpha" })!;
  const output = new Output({
    format: mode === "alpha" ? new WebMOutputFormat() : new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, {
    codec: mode === "alpha" ? "vp9" : "avc",
    bitrate: QUALITY_HIGH,
    alpha: mode === "alpha" ? "keep" : "discard",
  });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  const frames = Math.ceil(duration * fps);
  for (let f = 0; f < frames; f++) {
    if (signal?.aborted) {
      await output.cancel();
      throw new DOMException("Export cancelled", "AbortError");
    }
    const t = f / fps;
    if (mode === "green") {
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }
    drawCaptions(ctx, width, height, t, lines, style);
    await source.add(t, 1 / fps);
    if (f % 15 === 0) onProgress(f / frames);
  }
  await output.finalize();
  onProgress(1);
  return new Blob([(output.target as BufferTarget).buffer!], { type: mode === "alpha" ? "video/webm" : "video/mp4" });
}

// ~7.5 Mbps at 1080x1920: what Instagram re-encodes to anyway, a fifth of QUALITY_HIGH's size.
const bitrateFor = (w: number, h: number) => Math.round(w * h * 30 * 0.12);

// H.264 needs even dimensions.
const even = (s: { width: number; height: number }) => ({
  width: Math.max(2, s.width - (s.width % 2)),
  height: Math.max(2, s.height - (s.height % 2)),
});

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
