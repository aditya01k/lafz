/**
 * Until accounts exist, transcription is free and open, so cap what one IP can
 * spend: 20 minutes of audio an hour. In memory, so it resets on deploy; good
 * enough for one instance.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SECONDS = 20 * 60;
const used = new Map<string, { since: number; seconds: number }>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Returns false when this request would go over the cap. */
export function spend(ip: string, seconds: number): boolean {
  const now = Date.now();
  const entry = used.get(ip);
  const cur = entry && now - entry.since < WINDOW_MS ? entry : { since: now, seconds: 0 };
  if (cur.seconds + seconds > MAX_SECONDS) return false;
  cur.seconds += seconds;
  used.set(ip, cur);
  if (used.size > 10_000) {
    for (const [k, v] of used) if (now - v.since >= WINDOW_MS) used.delete(k);
  }
  return true;
}
