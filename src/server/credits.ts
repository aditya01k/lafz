import { randomUUID } from "node:crypto";
import { db } from "./db";

// A transcription takes at most a few minutes; anything still unsettled after this crashed.
const STALE_CHARGE_MINUTES = 15;

/** Refunds this user's charges whose transcription never finished (server restart, crash). */
async function refundStale(userId: string) {
  await db().query(
    `insert into credit_ledger (user_id, seconds, kind, ref, note)
     select user_id, -seconds, 'refund', 'refund:' || ref, 'Transcription interrupted' from credit_ledger
     where user_id = $1 and kind = 'use' and not settled and at < now() - ($2 || ' minutes')::interval
     on conflict (ref) do nothing`,
    [userId, String(STALE_CHARGE_MINUTES)],
  );
  await db().query(
    `update credit_ledger set settled = true
     where user_id = $1 and kind = 'use' and not settled and at < now() - ($2 || ' minutes')::interval`,
    [userId, String(STALE_CHARGE_MINUTES)],
  );
}

/** Seconds of video left. */
export async function balance(userId: string): Promise<number> {
  await refundStale(userId);
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
    await refundStale(userId);
    const { rows } = await client.query<{ s: string | null }>("select sum(seconds) as s from credit_ledger where user_id = $1", [userId]);
    if (Number(rows[0]?.s ?? 0) < seconds) {
      await client.query("rollback");
      return null;
    }
    const ref = `use:${randomUUID()}`;
    await client.query("insert into credit_ledger (user_id, seconds, kind, ref, note, settled) values ($1, $2, 'use', $3, $4, false)", [
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

/** Marks a charge final once its captions were delivered. */
export async function settleCharge(chargeRef: string) {
  await db().query("update credit_ledger set settled = true where ref = $1", [chargeRef]);
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
  await settleCharge(chargeRef);
}

/** Adds a paid pack. The payment id is the ref, so a redelivered webhook adds nothing. */
export async function topUp(userId: string, seconds: number, paymentId: string, note: string): Promise<boolean> {
  const r = await db().query(
    "insert into credit_ledger (user_id, seconds, kind, ref, note) values ($1, $2, 'topup', $3, $4) on conflict (ref) do nothing",
    [userId, seconds, `pay:${paymentId}`, note],
  );
  return Boolean(r.rowCount);
}

/**
 * Takes back a refunded or disputed payment's credits (the balance may go below zero, and then
 * nothing more can be captioned until it's topped up). `share` is the part of the payment
 * returned: 1 for a full refund or a lost dispute, less for a partial refund. `key` keeps each
 * refund separate, so two partial refunds both count but a redelivered one doesn't.
 */
export async function revokePayment(paymentId: string, share = 1, key = "full"): Promise<boolean> {
  const r = await db().query(
    // Never take back more than the payment added, however refunds and disputes combine.
    `insert into credit_ledger (user_id, seconds, kind, ref, note)
     select p.user_id,
            -least(ceil(p.seconds * $2::numeric)::int,
                   p.seconds + coalesce((select sum(r.seconds) from credit_ledger r where r.ref like 'revoke:' || p.ref || ':%'), 0)),
            'revoke', 'revoke:' || p.ref || ':' || $3,
            case when $2::numeric >= 1 then 'Payment refunded or disputed' else 'Payment partly refunded' end
     from credit_ledger p
     where p.ref = $1
     on conflict (ref) do nothing`,
    [`pay:${paymentId}`, Math.min(1, Math.max(0, share)), key],
  );
  return Boolean(r.rowCount);
}
