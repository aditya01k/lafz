/** How times are shown: seconds (1:05.32) or SMPTE frames (00:01:05:08) at the video's rate. */
export type Timecode = { mode: "seconds" | "frames"; fps: number };

/** 1:05.32 (or 1:05 when the fraction isn't wanted). */
export function clock(s: number, fraction = true) {
  const v = Math.max(0, s);
  const m = Math.floor(v / 60);
  const sec = v - m * 60;
  return fraction ? `${m}:${sec.toFixed(2).padStart(5, "0")}` : `${m}:${String(Math.floor(sec)).padStart(2, "0")}`;
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** Non-drop-frame SMPTE timecode. */
export function smpte(s: number, fps: number) {
  const base = Math.round(fps);
  const total = Math.round(Math.max(0, s) * fps);
  const f = total % base;
  const secs = Math.floor(total / base);
  return `${p2(Math.floor(secs / 3600))}:${p2(Math.floor(secs / 60) % 60)}:${p2(secs % 60)}:${p2(f)}`;
}

export const formatTime = (s: number, tc: Timecode) => (tc.mode === "frames" ? smpte(s, tc.fps) : clock(s));

/** Snaps a time to the nearest frame. */
export const toFrame = (s: number, fps: number) => Math.round(s * fps) / fps;

/**
 * Reads a time back: "1:05.32", "65.3", "00:01:05:08" (frames, when in frame mode),
 * or "+3f" / "-0.5" style nudges are handled by the caller.
 */
export function parseTime(text: string, tc: Timecode): number | null {
  const parts = text.trim().replace(",", ".").split(":");
  if (!parts.length || parts.some((p) => p === "" || Number.isNaN(Number(p)))) return null;
  if (tc.mode === "frames" && parts.length === 4) {
    const [h, m, s, f] = parts.map(Number);
    return h * 3600 + m * 60 + s + f / Math.round(tc.fps);
  }
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

/** Kept for older callers. */
export const parseClock = (text: string) => parseTime(text, { mode: "seconds", fps: 30 });
