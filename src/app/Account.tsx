"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/authClient";
import { PACKS, RUPEES_PER_MINUTE, minutesLabel } from "@/lib/pricing";

/**
 * The hosted account: sign-in and the credit balance. On self-hosted copies `/api/me`
 * says billing is off and none of this renders.
 */
type Me = { billing: boolean; local?: boolean; user?: { email: string; name: string | null } | null; seconds?: number };

type AccountCtx = {
  me: Me | null;
  refresh: () => Promise<Me | null>;
  setSeconds: (s: number) => void;
  openSignIn: () => void;
  /** With `then`, checkout opens in a new tab and `then` runs once `needed` seconds are there. */
  openBuy: (reason?: string, then?: { needed: number; onPaid: () => void }) => void;
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
  const [dialog, setDialog] = useState<{ kind: "buy"; reason?: string; then?: { needed: number; onPaid: () => void } } | null>(null);
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
    // Sign-in lives on its own page now, never in a dialog.
    openSignIn: () => {
      location.href = "/login?next=/app";
    },
    openBuy: (reason, then) => setDialog({ kind: "buy", reason, then }),
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {dialog?.kind === "buy" && <BuyDialog reason={dialog.reason} then={dialog.then} onClose={() => setDialog(null)} refresh={refresh} />}
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
  const { me, openBuy } = useAccount();
  const [menu, setMenu] = useState(false);
  if (me?.local) {
    return (
      <span className="flex h-8 items-center gap-2 rounded-full border border-hairline px-3 text-[13px]" title="Local mode: Whisper and the spelling model run on this Mac">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        On this Mac · offline
      </span>
    );
  }
  if (!me?.billing) return null;
  if (!me.user) {
    return (
      <a href="/login?next=/app" className="h-8 rounded-full px-3 text-[13px] leading-8 text-muted hover:text-foreground">
        Sign in
      </a>
    );
  }
  return (
    <div className="relative">
      <button
        onClick={() => setMenu((m) => !m)}
        className="flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-hairline px-3 text-[13px] hover:border-white/20"
      >
        <span className="size-1.5 rounded-full bg-accent" />
        <span className="tabular-nums">{minutesLabel(me.seconds ?? 0)}</span>
        <span className="hidden text-muted sm:inline">left</span>
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
              location.href = "/";
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

function BuyDialog({
  reason,
  then,
  onClose,
  refresh,
}: {
  reason?: string;
  then?: { needed: number; onPaid: () => void };
  onClose: () => void;
  refresh: () => Promise<Me | null>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const dev = process.env.NODE_ENV === "development";

  // Paying from the editor: checkout runs in another tab, this one waits for the credits so the
  // edit (which lives only in this tab) is never lost.
  useEffect(() => {
    if (!waiting || !then) return;
    let alive = true;
    const tick = async () => {
      const m = await refresh();
      if (!alive) return;
      if ((m?.seconds ?? 0) >= then.needed) {
        onClose();
        then.onPaid();
      } else setTimeout(tick, 3000);
    };
    const id = setTimeout(tick, 3000);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [waiting, then, refresh, onClose]);

  if (waiting) {
    return (
      <Modal onClose={onClose}>
        <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Finish paying in the new tab</h2>
        <p className="mt-1.5 text-[14px] text-muted">Your edit is safe here. As soon as the credits arrive, your export starts on its own.</p>
        <div className="mt-6 flex items-center gap-3 text-[14px]">
          <span className="size-2 animate-pulse rounded-full bg-accent" /> Waiting for payment…
        </div>
        <button onClick={onClose} className="mt-6 text-[13px] text-muted hover:text-foreground">
          Cancel
        </button>
      </Modal>
    );
  }

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
              // Opened now, inside the click, so popup blockers allow it; pointed at checkout below.
              const tab = then ? window.open("", "_blank") : null;
              const res = await fetch("/api/credits/checkout", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ pack: p.id }),
              });
              const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
              if (json.url && tab) {
                tab.location.href = json.url;
                setWaiting(true);
              } else if (json.url) location.href = json.url;
              else {
                tab?.close();
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
            const m = await refresh();
            onClose();
            if (then && (m?.seconds ?? 0) >= then.needed) then.onPaid();
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
