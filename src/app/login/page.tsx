import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { billingOn, currentUser } from "@/server/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage() {
  // No accounts on self-hosted copies; already signed in goes straight to the app.
  if (!billingOn() || (await currentUser())) redirect("/app");
  return <LoginForm google={process.env.NEXT_PUBLIC_GOOGLE_SIGNIN === "1"} />;
}
