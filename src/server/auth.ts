import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { headers } from "next/headers";
import { Resend } from "resend";
import { siteUrl } from "@/lib/site";
import { db } from "./db";

/**
 * Hosted sign-in (Better Auth on Postgres): Google, or a link by email sent with Resend.
 * No passwords. Built on first use, since the keys aren't there at build time.
 */
function build() {
  const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  return betterAuth({
    baseURL: siteUrl(),
    database: db(),
    // Sign-in links send real email: at most 3 a minute per IP, so nobody can use us to spam an inbox.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: { "/sign-in/magic-link": { window: 60, max: 3 } },
    },
    socialProviders: google
      ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
      : {},
    plugins: [
      magicLink({
        expiresIn: 15 * 60,
        sendMagicLink: async ({ email, url }) => {
          if (!resend) {
            // Without Resend (local development) the link goes to the server log.
            if (process.env.NODE_ENV === "development") return console.log(`[auth] sign-in link for ${email}: ${url}`);
            throw new Error("Email sign-in isn't set up.");
          }
          const { error } = await resend.emails.send({
            from: process.env.EMAIL_FROM!,
            to: email,
            subject: "Sign in to Lafz",
            text: `Open this link to sign in to Lafz:\n\n${url}\n\nIt works once, for 15 minutes. If you didn't ask for it, ignore this email.`,
          });
          if (error) throw new Error(error.message);
        },
      }),
      // Lets sign-in calls made on the server set the session cookie. Keep it last.
      nextCookies(),
    ],
  });
}

let instance: ReturnType<typeof build> | null = null;
export const auth = () => (instance ??= build());

/**
 * Accounts and credits are on only when the hosted deployment configures a database.
 * Self-hosted copies leave these unset and run free, with no sign-in.
 */
export const billingOn = () => Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);

export type User = { id: string; email: string; name: string | null };

export async function currentUser(): Promise<User | null> {
  if (!billingOn()) return null;
  const session = await auth().api.getSession({ headers: await headers() });
  return session ? { id: session.user.id, email: session.user.email, name: session.user.name || null } : null;
}
