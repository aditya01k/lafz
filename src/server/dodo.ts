import DodoPayments from "dodopayments";
import type { Pack } from "@/lib/pricing";
import { db } from "./db";

/**
 * Dodo Payments (merchant of record) sells the credit packs. Test mode until
 * DODO_PAYMENTS_ENVIRONMENT=live_mode.
 */
let client: DodoPayments | null = null;

export function dodo(): DodoPayments {
  const key = process.env.DODO_PAYMENTS_API_KEY;
  if (!key) throw new Error("DODO_PAYMENTS_API_KEY is not set.");
  return (client ??= new DodoPayments({
    bearerToken: key,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  }));
}

const mode = () => (process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live" : "test");

/**
 * The Dodo product for a pack: made on first use and remembered, so a new deployment
 * (or a self-hoster turning on billing) needs no setup in Dodo's dashboard.
 */
export async function productFor(pack: Pack): Promise<string> {
  const key = `dodo_product:${mode()}:${pack.id}`;
  const found = await db().query<{ value: string }>("select value from settings where key = $1", [key]);
  if (found.rows[0]) return found.rows[0].value;
  const product = await dodo().products.create({
    name: `Lafz credits: ${pack.minutes} minutes`,
    description: `${pack.minutes} minutes of captioning on Lafz. Credits never expire.`,
    tax_category: "saas",
    price: {
      type: "one_time_price",
      currency: "INR",
      // Paise; tax-inclusive so the price on the page is the price paid.
      price: pack.rupees * 100,
      discount: 0,
      purchasing_power_parity: false,
      tax_inclusive: true,
    },
    metadata: { pack: pack.id },
  });
  await db().query("insert into settings (key, value) values ($1, $2) on conflict (key) do nothing", [key, product.product_id]);
  return (await db().query<{ value: string }>("select value from settings where key = $1", [key])).rows[0].value;
}
