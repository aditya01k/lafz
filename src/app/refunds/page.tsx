import type { Metadata } from "next";
import { CONTACT, LegalPage } from "../legal";

export const metadata: Metadata = { title: "Refunds", description: "How refunds work for lafz credits." };

export default function Refunds() {
  return (
    <LegalPage title="Refunds">
      <p>Lafz credits are prepaid and never expire. Here&apos;s when you get money back.</p>

      <h2>Unused credits</h2>
      <p>
        Within 14 days of buying a pack, you can ask for a refund of the credits from it that you haven&apos;t used. If you&apos;ve
        used part of the pack, we refund the unused part.
      </p>

      <h2>When something goes wrong</h2>
      <ul>
        <li>Transcribing is free, so a failed or poor transcription never costs you credits.</li>
        <li>Credits are taken only at a video&apos;s first export. If that export fails, export again: it&apos;s already paid for and won&apos;t be charged twice.</li>
        <li>If you were charged by mistake, or something on our side stopped you using credits you paid for, we&apos;ll refund them, whenever you bought them.</li>
      </ul>

      <h2>How to ask</h2>
      <p>
        Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from your account&apos;s email address with the date of the purchase.
        Refunds go back to the original payment method through Dodo Payments, usually within 5 to 10 business days.
      </p>

      <h2>Chargebacks</h2>
      <p>
        Please write to us before disputing a payment with your bank; it&apos;s faster. If a payment is refunded or disputed, the
        credits it added are removed from your balance.
      </p>
    </LegalPage>
  );
}
