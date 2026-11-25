/** 1:05.32 (or 1:05 when the fraction isn't wanted). */
export function clock(s: number, fraction = true) {
  const v = Math.max(0, s);
  const m = Math.floor(v / 60);
  const sec = v - m * 60;
  return fraction ? `${m}:${sec.toFixed(2).padStart(5, "0")}` : `${m}:${String(Math.floor(sec)).padStart(2, "0")}`;
}

/** Reads "1:05.32", "65.3", "0:01:05.32" or "1:05:08" back into seconds. */
export function parseClock(text: string): number | null {
  const parts = text.trim().replace(",", ".").split(":");
  if (!parts.length || parts.some((p) => p === "" || Number.isNaN(Number(p)))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}
