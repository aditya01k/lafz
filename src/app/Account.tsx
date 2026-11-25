"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/authClient";
import { PACKS, RUPEES_PER_MINUTE, minutesLabel } from "@/lib/pricing";

/**
 * The hosted account: sign-in and the credit balance. On self-hosted copies `/api/me`
 * says billing is off and none of this renders.
 */
type Me = { billing: boolean; user?: { email: string; name: string | null } | null; seconds?: number };

type AccountCtx = {
  me: Me | null;
  refresh: () => Promise<Me | null>;
  setSeconds: (s: number) => void;
  openSignIn: () => void;
  openBuy: (reason?: string) => void;
};

const Ctx = createContext<AccountCtx>({
  me: null,
  refresh: async () => null,
  setSeconds: () => {},
  openSignIn: () => {},
  openBuy: () => {},
});

export const useAccount = () => useContext(Ctx);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [dialog, setDialog] = useState<{ kind: "signin" } | { kind: "buy"; reason?: string } | null>(null);
  const [toast, setToast] = useState("");

  const refresh = useCallback(async () => {
    const next = (await fetch("/api/me").then((r) => r.json()).catch(() => null)) as Me | null;
    setMe(next);
    return next;
  }, []);

  useEffect(() => {
    // Back from Dodo (?paid=…): the webhook may land a moment after the redirect, so check a few times.
    const paid = new URLSearchParams(location.search).get("paid");
    if (paid) history.replaceState(null, "", location.pathname);
    let tries = 0;
    let before: number | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const m = await refresh();
      if (!paid) return;
      if (tries === 0) setToast("Payment received. Adding your credits…");
      before ??= m?.seconds;
      if (tries > 0 && m?.seconds !== undefined && before !== undefined && m.seconds > before) return setToast("Credits added.");
      if (++tries < 10) timer = setTimeout(poll, 2000);
      else setToast("Payment received. Credits can take a minute to show.");
    };
    timer = setTimeout(poll, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const ctx: AccountCtx = {
    me,
    refresh,
    setSeconds: (s) => setMe((m) => (m ? { ...m, seconds: s } : m)),
    openSignIn: () => setDialog({ kind: "signin" }),
    openBuy: (reason) => setDialog({ kind: "buy", reason }),
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {dialog?.kind === "signin" && <SignInDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === "buy" && <BuyDialog reason={dialog.reason} onClose={() => setDialog(null)} onDevPaid={refresh} />}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-hairline bg-raised px-4 py-2 text-[14px] shadow-xl">
          {toast}
        </div>
      )}
    </Ctx.Provider>
  );
}

/** Nav / header control: Sign in, or the balance with a way to add credits. */
export function AccountButton() {
  const { me, openSignIn, openBuy, refresh } = useAccount();
  const [menu, setMenu] = useState(false);
  if (!me?.billing) return null;
  if (!me.user) {
    return (
      <button onClick={openSignIn} className="h-8 rounded-full px-3 text-[13px] text-muted hover:text-foreground">
        Sign in
      </button>
    );
  }
  return (
    <div className="relative">
      <button
        onClick={() => setMenu((m) => !m)}
        className="flex h-8 items-center gap-2 rounded-full border border-hairline px-3 text-[13px] hover:border-white/20"
      >
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="tabular-nums">{minutesLabel(me.seconds ?? 0)}</span>
        <span className="text-muted">left</span>
      </button>
      {menu && (
        <div className="absolute top-10 right-0 z-40 w-60 rounded-xl border border-hairline bg-surface p-1.5 shadow-2xl" onMouseLeave={() => setMenu(false)}>
          <div className="truncate px-3 py-2 text-[12px] text-muted">{me.user.email}</div>
          <button
            onClick={() => {
              setMenu(false);
              openBuy();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-[14px] hover:bg-white/5"
          >
            Add credits
          </button>
          <button
            onClick={async () => {
              await authClient.signOut();
              setMenu(false);
              await refresh();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-[14px] text-muted hover:bg-white/5 hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl border border-hairline bg-surface p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function SignInDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const google = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "1";
  return (
    <Modal onClose={onClose}>
      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Sign in to lafz</h2>
      <p className="mt-1.5 text-[14px] text-muted">Your credits stay with your account. No password.</p>
      {state === "sent" ? (
        <div className="mt-6 rounded-xl border border-hairline bg-black p-4 text-[14px]">
          Check <span className="font-medium">{email}</span> for a sign-in link. It works for 15 minutes.
        </div>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setState("sending");
            const { error } = await authClient.signIn.magicLink({ email, callbackURL: location.pathname });
            setState(error ? "error" : "sent");
          }}
        >
          {google && (
            <>
              <button
                type="button"
                onClick={() => authClient.signIn.social({ provider: "google", callbackURL: location.pathname })}
                className="h-11 w-full rounded-full border border-hairline text-[14px] font-medium hover:border-white/25"
              >
                Continue with Google
              </button>
              <div className="text-center text-[12px] text-muted">or</div>
            </>
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-hairline bg-black px-4 text-[15px] outline-none focus:border-white/30"
          />
          <button disabled={state === "sending"} className="h-11 w-full rounded-full bg-white text-[14px] font-medium text-black disabled:opacity-50">
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {state === "error" && <p className="text-[13px] text-red-300">Couldn&apos;t send the link. Check the address and try again.</p>}
        </form>
      )}
    </Modal>
  );
}

function BuyDialog({ reason, onClose, onDevPaid }: { reason?: string; onClose: () => void; onDevPaid: () => Promise<unknown> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const dev = process.env.NODE_ENV === "development";
  return (
    <Modal onClose={onClose}>
      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Add credits</h2>
      <p className="mt-1.5 text-[14px] text-muted">
        {reason ? `${reason} ` : ""}₹{RUPEES_PER_MINUTE} per minute of video. Credits never expire.
      </p>
      <div className="mt-6 space-y-2">
        {PACKS.map((p) => (
          <button
            key={p.id}
            disabled={Boolean(busy)}
            onClick={async () => {
              setBusy(p.id);
              setError("");
              const res = await fetch("/api/credits/checkout", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ pack: p.id }),
              });
              const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
              if (json.url) location.href = json.url;
              else {
                setError(json.error ?? "Checkout couldn't start.");
                setBusy(null);
              }
            }}
            className="flex w-full items-center justify-between rounded-xl border border-hairline bg-black px-4 py-3.5 text-left transition hover:border-white/25 disabled:opacity-60"
          >
            <span>
              <span className="block text-[16px] font-semibold">{p.minutes} minutes</span>
              <span className="block font-mono text-[12px] text-muted">{p.minutes} one-minute reels · ₹{RUPEES_PER_MINUTE}/min</span>
            </span>
            <span className="text-[16px] font-semibold">{busy === p.id ? "…" : `₹${p.rupees.toLocaleString("en-IN")}`}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-[13px] text-red-300">{error}</p>}
      {dev && (
        <button
          onClick={async () => {
            await fetch("/api/dev/topup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pack: PACKS[0].id }) });
            await onDevPaid();
            onClose();
          }}
          className="mt-4 w-full rounded-lg border border-dashed border-white/20 py-2 font-mono text-[12px] text-muted hover:text-foreground"
        >
          dev: simulate a paid ₹200 pack
        </button>
      )}
      <p className="mt-5 text-[12px] text-muted">Payments by Dodo Payments. Or run lafz yourself for free: it&apos;s open source.</p>
    </Modal>
  );
}
