import { toNextJsHandler } from "better-auth/next-js";
import { auth, billingOn } from "@/server/auth";

/** Better Auth's endpoints: Google's callback, email links, the session, sign-out. */
const handle = (request: Request) =>
  billingOn() ? auth().handler(request) : Promise.resolve(new Response("Accounts aren't set up", { status: 404 }));

export const { GET, POST } = toNextJsHandler(handle);
