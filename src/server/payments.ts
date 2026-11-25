import { packById } from "@/lib/pricing";
import { topUp } from "./credits";
import { db } from "./db";

/**
 * Adds a paid pack to the right user. The user comes from their Dodo customer, else the
 * checkout's metadata, else the checkout we recorded; the pack from metadata or that checkout.
 */
export async function creditPayment(p: {
  paymentId: string;
  customerId: string;
  sessionId: string | null;
  metadata?: Record<string, unknown>;
  packId?: string;
}): Promise<Record<string, unknown>> {
  const checkout = p.sessionId
    ? (await db().query<{ user_id: string; pack: string }>("select user_id, pack from checkouts where session_id = $1", [p.sessionId])).rows[0]
    : undefined;
  const byCustomer = (await db().query<{ user_id: string }>("select user_id from profiles where customer_id = $1", [p.customerId])).rows[0]?.user_id;
  const userId = byCustomer ?? str(p.metadata?.user_id) ?? checkout?.user_id;
  const pack = packById(p.packId ?? checkout?.pack ?? "");
  if (!userId || !pack) return { ignored: "no user or pack" };
  const added = await topUp(userId, pack.minutes * 60, p.paymentId, `${pack.minutes} min pack, ₹${pack.rupees}`);
  return { ok: true, added };
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
