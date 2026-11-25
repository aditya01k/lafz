import { creditPayment } from "@/server/payments";
import { revokePayment } from "@/server/credits";
import { dodo } from "@/server/dodo";

/**
 * Dodo webhooks, the only place paid credits are written (signed per Standard Webhooks):
 *   payment.succeeded                        → the pack's minutes are added
 *   refund.succeeded                        → that share of the payment's minutes is taken back
 *   dispute.lost                            → all of that payment's minutes are taken back
 * Payments for anything else sold on the same Dodo account are ignored.
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
    return Response.json(
      await creditPayment({
        paymentId: p.payment_id,
        customerId: p.customer.customer_id,
        sessionId: p.checkout_session_id ?? null,
        metadata: p.metadata,
        productIds: (p.product_cart ?? []).map((i) => i.product_id),
      }),
    );
  }
  if (event.type === "refund.succeeded") {
    const r = event.data;
    let share = 1;
    if (r.is_partial) {
      // Partial: take back minutes in proportion to the money returned.
      const pay = await dodo().payments.retrieve(r.payment_id);
      share = pay.total_amount > 0 && r.amount ? r.amount / pay.total_amount : 0;
    }
    return Response.json({ revoked: await revokePayment(r.payment_id, share, r.refund_id) });
  }
  if (event.type === "dispute.lost") {
    return Response.json({ revoked: await revokePayment(event.data.payment_id, 1, "dispute") });
  }
  return Response.json({ ignored: event.type });
}
