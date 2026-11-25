import type { Metadata } from "next";
import Link from "next/link";
import { RUPEES_PER_MINUTE } from "@/lib/pricing";
import { CONTACT, LegalPage, OPERATOR } from "../legal";

export const metadata: Metadata = { title: "Terms", description: "The terms for using the hosted lafz service." };

export default function Terms() {
  return (
    <LegalPage title="Terms">
      <p>
        These terms cover the hosted service at uselafz.in, run by {OPERATOR} in India (&quot;lafz&quot;, &quot;we&quot;). By using it you
        agree to them.
      </p>

      <h2>The open-source code</h2>
      <p>
        Lafz&apos;s source code is published under the GNU AGPL-3.0 licence. Running it yourself is governed by that licence, not by
        these terms.
      </p>

      <h2>Your account</h2>
      <p>
        You sign in with a link sent to your email. Keep access to that inbox secure; you&apos;re responsible for what happens on
        your account. You must be 18 or over, or have a parent or guardian&apos;s consent.
      </p>

      <h2>Credits and payment</h2>
      <ul>
        <li>Captioning is paid with prepaid credits, priced at ₹{RUPEES_PER_MINUTE} per minute of video and counted by the second.</li>
        <li>Transcribing and editing a video is free. Its minutes are taken from your credits the first time you export it; exporting it again is free.</li>
        <li>
          To keep this fair, videos captioned but never exported are limited (currently 15 minutes a week, plus whatever your balance
          would cover).
        </li>
        <li>Credits don&apos;t expire, can&apos;t be transferred, and have no cash value except as set out in our <Link href="/refunds">refund policy</Link>.</li>
        <li>Payments are processed by Dodo Payments, the merchant of record, which also handles applicable taxes.</li>
        <li>Prices may change; credits you&apos;ve already bought keep the value they had.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        Your videos and captions are yours. You give us permission only to process your audio to make your captions, as described
        in our <Link href="/privacy">privacy policy</Link>. You confirm you have the right to use the content you upload.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t use lafz for anything illegal, or for content that infringes someone else&apos;s rights.</li>
        <li>Don&apos;t try to get around credits, limits or security, or overload the service with automated requests.</li>
      </ul>
      <p>We may suspend accounts that break these rules. Unused credits are refunded unless the account was used for fraud or abuse.</p>

      <h2>Accuracy</h2>
      <p>
        Captions are made by speech-recognition models and can contain mistakes, especially with noise, music or heavy accents.
        Check them before you publish.
      </p>

      <h2>The service</h2>
      <p>
        We work to keep lafz running well, but it&apos;s provided as is, without guarantees that it will always be available or
        error-free. We may change or discontinue features; if we shut the hosted service down, we&apos;ll refund unused credits.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, our total liability for any claim about the service is limited to what you paid us in the
        three months before it, and we aren&apos;t liable for indirect or consequential losses.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of India, and disputes go to the courts of India.</p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above shows the latest version, and we&apos;ll email signed-in users about significant
        changes. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>
    </LegalPage>
  );
}
