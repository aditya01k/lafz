import { packById, type Pack } from "@/lib/pricing";
import { topUp } from "./credits";
import { db } from "./db";

/**
 * The lafz pack a Dodo product is, from the products we created (settings table). The same
 * Dodo business sells other things too, and their payments reach this webhook: those aren't ours.
 */
export async function packForProduct(productId: string): Promise<Pack | undefined> {
  const { rows } = await db().query<{ key: string }>("select key from settings where key like 'dodo_product:%' and value = $1", [productId]);
  return rows[0] ? packById(rows[0].key.split(":").at(-1) ?? "") : undefined;
}

/**
 * Adds a paid pack to the right user. The pack comes from the product actually paid for (never
 * metadata alone); the user from their Dodo customer, else the checkout we recorded, else metadata.
 */
export async function creditPayment(p: {
  paymentId: string;
  customerId: string;
  sessionId: string | null;
  metadata?: Record<string, unknown>;
  productIds: string[];
  /** Development only: the pack, when no real product exists. */
  devPack?: string;
}): Promise<Record<string, unknown>> {
  const packs = (await Promise.all(p.productIds.map(packForProduct))).filter(Boolean) as Pack[];
  const pack = packs[0] ?? (p.devPack ? packById(p.devPack) : undefined);
  if (!pack) return { ignored: "not a lafz credit pack" };
  const checkout = p.sessionId
    ? (await db().query<{ user_id: string }>("select user_id from checkouts where session_id = $1", [p.sessionId])).rows[0]
    : undefined;
  const byCustomer = (await db().query<{ user_id: string }>("select user_id from profiles where customer_id = $1", [p.customerId])).rows[0]?.user_id;
  const candidate = byCustomer ?? checkout?.user_id ?? str(p.metadata?.user_id);
  // Only credit a user that exists here (metadata from another product could name anyone).
  const userId = candidate
    ? (await db().query<{ id: string }>('select id from "user" where id = $1', [candidate])).rows[0]?.id
    : undefined;
  if (!userId) return { ignored: "no lafz user for this payment" };
  const added = await topUp(userId, pack.minutes * 60, p.paymentId, `${pack.minutes} min pack, ₹${pack.rupees}`);
  return { ok: true, added };
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
