import { randomUUID } from "node:crypto";
import { db } from "./db";

/** Seconds of video left. */
export async function balance(userId: string): Promise<number> {
  const { rows } = await db().query<{ s: string | null }>("select sum(seconds) as s from credit_ledger where user_id = $1", [userId]);
  return Number(rows[0]?.s ?? 0);
}

/**
 * Takes `seconds` from the balance before a transcription starts. Locked per user, so two
 * uploads at once can't both spend the same credit. Returns the charge's ref, or null if the
 * balance is too low.
 */
export async function charge(userId: string, seconds: number, note: string): Promise<string | null> {
  const client = await db().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [userId]);
    const { rows } = await client.query<{ s: string | null }>("select sum(seconds) as s from credit_ledger where user_id = $1", [userId]);
    if (Number(rows[0]?.s ?? 0) < seconds) {
      await client.query("rollback");
      return null;
    }
    const ref = `use:${randomUUID()}`;
    await client.query("insert into credit_ledger (user_id, seconds, kind, ref, note) values ($1, $2, 'use', $3, $4)", [
      userId,
      -seconds,
      ref,
      note.slice(0, 200),
    ]);
    await client.query("commit");
    return ref;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Gives a failed transcription's credits back. Safe to call twice. */
export async function refundCharge(userId: string, chargeRef: string) {
  await db().query(
    `insert into credit_ledger (user_id, seconds, kind, ref, note)
     select user_id, -seconds, 'refund', 'refund:' || ref, 'Transcription failed' from credit_ledger
     where ref = $1 and user_id = $2
     on conflict (ref) do nothing`,
    [chargeRef, userId],
  );
}

/** Adds a paid pack. The payment id is the ref, so a redelivered webhook adds nothing. */
export async function topUp(userId: string, seconds: number, paymentId: string, note: string): Promise<boolean> {
  const r = await db().query(
    "insert into credit_ledger (user_id, seconds, kind, ref, note) values ($1, $2, 'topup', $3, $4) on conflict (ref) do nothing",
    [userId, seconds, `pay:${paymentId}`, note],
  );
  return Boolean(r.rowCount);
}

/** Takes back a refunded or disputed payment's credits (the balance may go below zero). */
export async function revokePayment(paymentId: string): Promise<boolean> {
  const r = await db().query(
    `insert into credit_ledger (user_id, seconds, kind, ref, note)
     select user_id, -seconds, 'revoke', 'revoke:' || ref, 'Payment refunded or disputed' from credit_ledger
     where ref = $1
     on conflict (ref) do nothing`,
    [`pay:${paymentId}`],
  );
  return Boolean(r.rowCount);
}
