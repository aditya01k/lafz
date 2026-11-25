import { z } from "zod";
import { packById } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { dodo, productFor } from "@/server/dodo";

const Body = z.object({ pack: z.string() });

/** Starts a Dodo checkout for a credit pack and returns its page. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  const pack = parsed.success ? packById(parsed.data.pack) : undefined;
  if (!pack) return Response.json({ error: "Choose a pack." }, { status: 400 });

  try {
    let customerId = (await db().query<{ customer_id: string | null }>("select customer_id from profiles where user_id = $1", [user.id]))
      .rows[0]?.customer_id;
    if (!customerId) {
      const customer = await dodo().customers.create({ email: user.email, name: user.name ?? user.email.split("@")[0], metadata: { user_id: user.id } });
      customerId = customer.customer_id;
      await db().query(
        "insert into profiles (user_id, customer_id) values ($1, $2) on conflict (user_id) do update set customer_id = coalesce(profiles.customer_id, excluded.customer_id)",
        [user.id, customerId],
      );
    }
    const session = await dodo().checkoutSessions.create({
      product_cart: [{ product_id: await productFor(pack), quantity: 1 }],
      customer: { customer_id: customerId },
      metadata: { user_id: user.id, pack: pack.id },
      // Off: discount codes on this Dodo account would apply here too, so a code made for
      // another product could hand out free credits.
      feature_flags: { allow_discount_code: false },
      return_url: `${siteUrl()}/app?paid=${pack.id}`,
    });
    await db().query("insert into checkouts (session_id, user_id, pack) values ($1, $2, $3)", [session.session_id, user.id, pack.id]);
    if (!session.checkout_url) return Response.json({ error: "Checkout couldn't start. Please try again." }, { status: 502 });
    return Response.json({ url: session.checkout_url });
  } catch (e) {
    console.error("[checkout] Dodo error:", e);
    return Response.json({ error: "Payments aren't working right now. Nothing was charged. Please try again in a few minutes." }, { status: 502 });
  }
}
