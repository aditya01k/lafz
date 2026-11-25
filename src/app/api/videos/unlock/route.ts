import { z } from "zod";
import { billingOn, currentUser } from "@/server/auth";
import { unlockVideo } from "@/server/videos";

const Body = z.object({ id: z.string().uuid() });

/** Pays for a video's minutes at its first export. Later exports of it are free. */
export async function POST(req: Request) {
  if (!billingOn()) return Response.json({ ok: true });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to export.", code: "signin" }, { status: 401 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const r = await unlockVideo(user.id, body.data.id);
  if (!r) return Response.json({ error: "We don't have this video on your account. Caption it again to export." }, { status: 404 });
  if (!r.ok) return Response.json({ error: "Not enough credits to export.", code: "credits", needed: r.needed, seconds: r.seconds }, { status: 402 });
  return Response.json({ ok: true, seconds: r.seconds });
}
