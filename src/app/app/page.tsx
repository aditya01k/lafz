import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { billingOn, currentUser } from "@/server/auth";
import { AccountProvider } from "../Account";
import Studio from "../Studio";

export const metadata: Metadata = { title: "App", robots: { index: false } };

/** The product. Hosted: signed-in users only. Self-hosted and local copies: open to whoever runs it. */
export default async function AppPage() {
  if (billingOn() && !(await currentUser())) redirect("/login?next=/app");
  return (
    <AccountProvider>
      <Studio />
    </AccountProvider>
  );
}
