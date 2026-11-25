"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/authClient";
import { RUPEES_PER_MINUTE } from "@/lib/pricing";

/** Sign in or sign up: the same email link does both. */
export default function LoginForm({ google }: { google: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center px-5">
        <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-tight">
          <img src="/logo-mark.svg" alt="" className="size-6 rounded-[6px]" />
          lafz
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-sm">
          {state === "sent" ? (
            <>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-[22px]">✉️</div>
              <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.02em]">Check your email</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                We sent a sign-in link to <span className="text-foreground">{email}</span>. It works once, for 15 minutes. You can close
                this tab.
              </p>
              <button onClick={() => setState("idle")} className="mt-6 text-[14px] text-muted underline hover:text-foreground">
                Use a different email
              </button>
            </>
          ) : (
            <>
              <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Sign in to lafz</h1>
              <p className="mt-2 text-[15px] text-muted">New here? The same link creates your account. No password.</p>
              <form
                className="mt-8 space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError("");
                  setState("sending");
                  const { error } = await authClient.signIn.magicLink({ email, callbackURL: "/app" });
                  if (error) {
                    setError(error.message || "Couldn't send the link. Please try again.");
                    setState("idle");
                  } else setState("sent");
                }}
              >
                {google && (
                  <>
                    <button
                      type="button"
                      onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/app" })}
                      className="h-11 w-full rounded-xl border border-hairline text-[14px] font-medium hover:border-white/25"
                    >
                      Continue with Google
                    </button>
                    <div className="py-1 text-center text-[12px] text-muted">or</div>
                  </>
                )}
                <label className="block">
                  <span className="text-[13px] text-muted">Email</span>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-surface px-4 text-[15px] outline-none focus:border-white/30"
                  />
                </label>
                <button disabled={state === "sending"} className="h-11 w-full rounded-xl bg-accent text-[14px] font-semibold text-accent-ink disabled:opacity-60">
                  {state === "sending" ? "Sending…" : "Email me a sign-in link"}
                </button>
                {error && <p className="text-[13px] text-red-300">{error}</p>}
              </form>
              <p className="mt-8 text-[12px] leading-relaxed text-muted">
                Captioning costs ₹{RUPEES_PER_MINUTE} a minute, prepaid. Or{" "}
                <Link href="/#mac" className="underline hover:text-foreground">
                  run lafz free on your own Mac
                </Link>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
