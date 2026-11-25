import Link from "next/link";

/**
 * Shared frame for the Terms, Privacy and Refund pages: the landing page's paper palette, one
 * readable column. The contact address comes from NEXT_PUBLIC_CONTACT_EMAIL.
 */

export const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@uselafz.in";
export const OPERATOR = "Aditya Sharma";
export const UPDATED = "25 November 2026";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-4 py-10 sm:py-16" style={{ background: "#ece6dc", color: "#1d1714" }}>
      <div className="mx-auto max-w-2xl">
        <nav className="flex items-center justify-between text-[14px]">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <img src="/logo-mark.svg" alt="" className="size-6 rounded-[6px]" />
            lafz
          </Link>
          <span className="flex gap-4" style={{ color: "#6f645c" }}>
            <Link href="/terms" className="hover:text-black">Terms</Link>
            <Link href="/privacy" className="hover:text-black">Privacy</Link>
            <Link href="/refunds" className="hover:text-black">Refunds</Link>
          </span>
        </nav>
        <h1 className="mt-14 text-[40px] leading-tight font-normal tracking-[-0.03em] sm:text-[52px]">{title}</h1>
        <p className="mt-2 text-[14px]" style={{ color: "#6f645c" }}>
          Last updated {UPDATED}
        </p>
        <div className="legal mt-10 space-y-5 text-[16px] leading-relaxed [&_h2]:mt-10 [&_h2]:text-[20px] [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2 [&_a]:underline">
          {children}
        </div>
        <p className="mt-14 border-t pt-6 text-[14px]" style={{ borderColor: "rgba(29,23,20,0.12)", color: "#6f645c" }}>
          Questions? Email <a href={`mailto:${CONTACT}`} className="underline">{CONTACT}</a>.
        </p>
      </div>
    </div>
  );
}
