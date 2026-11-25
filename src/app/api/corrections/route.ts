import { z } from "zod";
import { LANGUAGES } from "@/lib/languages";
import { currentUser } from "@/server/auth";
import { saveCorrections } from "@/server/corrections";

const Word = z.string().trim().min(1).max(40);
const Body = z.object({
  language: z.enum(LANGUAGES.map((l) => l.id) as [string, ...string[]]),
  script: z.enum(["latin", "native"]),
  pairs: z.array(z.object({ before: Word, after: Word })).min(1).max(50),
});

/** Word fixes from the editor (hosted, signed in, and only if the creator hasn't opted out). */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return new Response(null, { status: 204 });
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const pairs = body.data.pairs.filter((p) => p.before.toLowerCase() !== p.after.toLowerCase() && !/\s/.test(p.before + p.after));
  if (pairs.length) await saveCorrections(user.id, body.data.language, body.data.script, pairs);
  return new Response(null, { status: 204 });
}
