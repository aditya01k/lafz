import { billingOn, currentUser } from "@/server/auth";
import { localMode } from "@/server/local";
import { balance } from "@/server/credits";

/** Who's signed in and how many seconds of credit they have. `billing: false` on self-hosted copies. */
export async function GET() {
  if (!billingOn()) return Response.json({ billing: false, local: localMode() });
  const user = await currentUser();
  if (!user) return Response.json({ billing: true, user: null });
  return Response.json({ billing: true, user: { email: user.email, name: user.name }, seconds: await balance(user.id) });
}
