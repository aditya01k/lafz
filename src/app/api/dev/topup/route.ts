import { currentUser } from "@/server/auth";
import { creditPayment } from "@/server/payments";

/**
 * Development only: pretends Dodo confirmed a payment for the signed-in user, so the
 * credits flow can be tested without a public webhook URL. 404 everywhere else.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in first." }, { status: 401 });
  const { pack } = (await request.json().catch(() => ({}))) as { pack?: string };
  return Response.json(
    await creditPayment({ paymentId: `dev_${Date.now()}`, customerId: "dev", sessionId: null, metadata: { user_id: user.id }, productIds: [], devPack: pack }),
  );
}
