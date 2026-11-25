import { packById } from "@/lib/pricing";
import { creditPayment } from "@/server/payments";
import { revokePayment } from "@/server/credits";
import { dodo } from "@/server/dodo";

/**
 * Dodo webhooks, the only place paid credits are written (signed per Standard Webhooks):
 *   payment.succeeded                        → the pack's minutes are added
 *   refund.succeeded (full) or dispute.lost  → that payment's minutes are taken back
 */
export async function POST(request: Request) {
  if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY || !process.env.DODO_PAYMENTS_API_KEY) return new Response("Not configured", { status: 400 });
  const body = await request.text();
  const headers = Object.fromEntries(["webhook-id", "webhook-signature", "webhook-timestamp"].map((h) => [h, request.headers.get(h) ?? ""]));
  let event;
  try {
    event = dodo().webhooks.unwrap(body, { headers });
  } catch (e) {
    console.warn("[dodo] rejected a webhook:", e instanceof Error ? e.message : e);
    return new Response("Rejected", { status: 401 });
  }

  if (event.type === "payment.succeeded") {
    const p = event.data;
    const pack = packById(String(p.metadata?.pack ?? ""));
    return Response.json(
      await creditPayment({
        paymentId: p.payment_id,
        customerId: p.customer.customer_id,
        sessionId: p.checkout_session_id ?? null,
        metadata: p.metadata,
        packId: pack?.id,
      }),
    );
  }
  if ((event.type === "refund.succeeded" && !event.data.is_partial) || event.type === "dispute.lost") {
    return Response.json({ revoked: await revokePayment(event.data.payment_id) });
  }
  return Response.json({ ignored: event.type });
}
