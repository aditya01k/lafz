import { randomUUID } from "node:crypto";
import { balance, charge, settleCharge } from "./credits";
import { db } from "./db";

/**
 * Pay on export: transcribing a video is free, and its minutes are charged the first time it's
 * exported. Transcription still costs us, so unpaid videos are capped: at most this much in the
 * last week, on top of whatever the balance would cover.
 */
export const FREE_UNPAID_SECONDS = 15 * 60;

/** Seconds of video transcribed in the last 7 days and never exported. */
export async function unpaidSeconds(userId: string): Promise<number> {
  const { rows } = await db().query<{ s: string | null }>(
    "select sum(seconds) as s from videos where user_id = $1 and unlocked_at is null and created_at > now() - interval '7 days'",
    [userId],
  );
  return Number(rows[0]?.s ?? 0);
}

/** May this user transcribe `seconds` more without paying first? */
export async function mayTranscribe(userId: string, seconds: number) {
  const [unpaid, bal] = await Promise.all([unpaidSeconds(userId), balance(userId)]);
  return { ok: unpaid + seconds <= FREE_UNPAID_SECONDS + Math.max(0, bal), unpaid, balance: bal };
}

export async function recordVideo(userId: string, seconds: number, note: string): Promise<string> {
  const id = randomUUID();
  await db().query("insert into videos (id, user_id, seconds, note) values ($1, $2, $3, $4)", [id, userId, seconds, note.slice(0, 200)]);
  return id;
}

/**
 * Charges a video's minutes the first time it's exported. Safe to call on every export: once
 * unlocked, it's free forever. Returns null when the balance is too low.
 */
export async function unlockVideo(userId: string, videoId: string): Promise<{ ok: true; seconds: number } | { ok: false; needed: number; seconds: number } | null> {
  const { rows } = await db().query<{ seconds: number; unlocked_at: Date | null; note: string }>(
    "select seconds, unlocked_at, note from videos where id = $1 and user_id = $2",
    [videoId, userId],
  );
  const v = rows[0];
  if (!v) return null;
  if (v.unlocked_at) return { ok: true, seconds: await balance(userId) };
  const ref = await charge(userId, v.seconds, `Export: ${v.note}`);
  if (!ref) return { ok: false, needed: v.seconds, seconds: await balance(userId) };
  // Only the first of two simultaneous exports keeps its charge.
  const r = await db().query("update videos set unlocked_at = now(), charge_ref = $1 where id = $2 and unlocked_at is null", [ref, videoId]);
  if (!r.rowCount) {
    await db().query(
      `insert into credit_ledger (user_id, seconds, kind, ref, note) select user_id, -seconds, 'refund', 'refund:' || ref, 'Already exported' from credit_ledger where ref = $1 on conflict (ref) do nothing`,
      [ref],
    );
  }
  await settleCharge(ref);
  return { ok: true, seconds: await balance(userId) };
}
