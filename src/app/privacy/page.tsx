import type { Metadata } from "next";
import { CONTACT, LegalPage, OPERATOR } from "../legal";

export const metadata: Metadata = { title: "Privacy", description: "What lafz collects, where your audio goes, and your rights." };

export default function Privacy() {
  return (
    <LegalPage title="Privacy">
      <p>
        Lafz (uselafz.in) is run by {OPERATOR} in India. This page explains what the hosted service at uselafz.in collects and
        why. If you run lafz yourself, on your Mac in local mode or on your own server, none of it reaches us.
      </p>

      <h2>The short version</h2>
      <ul>
        <li>Your video never leaves your device. Your browser pulls out the audio and sends only that.</li>
        <li>We don&apos;t keep your audio or your captions. Your edits are saved in your own browser.</li>
        <li>No ads, no analytics, no tracking cookies. The only cookie keeps you signed in.</li>
        <li>In local mode on a Mac, nothing is sent anywhere.</li>
      </ul>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email address (and a name, if you give one), used to sign you in with an email link.
        </li>
        <li>
          <strong>Credits and videos:</strong> your purchases, your credit balance, and for each captioned video its length, the
          language you chose, and when it was first exported. Not the video, the audio, or the captions.
        </li>
        <li>
          <strong>Word fixes (optional):</strong> when you correct a word in the editor, the old and new spelling of that word, so
          lafz learns better spellings. Never the sentence, audio or video. You can turn this off with the checkbox in the editor.
        </li>
        <li>
          <strong>Server logs:</strong> IP address and request times, kept briefly for security and rate limits.
        </li>
      </ul>

      <h2>Where your audio goes</h2>
      <p>To caption a video, its audio (not the video) is sent over an encrypted connection to:</p>
      <ul>
        <li>
          <strong>Sarvam AI</strong> (India), which transcribes Indian languages.
        </li>
        <li>
          <strong>OpenAI</strong> (United States), which times each word and checks the spelling of the transcript.
        </li>
      </ul>
      <p>
        These providers process it to return captions and handle it under their own terms; OpenAI does not use API data to train
        its models by default. We don&apos;t store the audio or the transcript on our servers: the captions go straight back to
        your browser.
      </p>

      <h2>Others who help run lafz</h2>
      <ul>
        <li>
          <strong>Dodo Payments</strong> processes payments as the merchant of record. We never see your card or UPI details.
        </li>
        <li>
          <strong>Resend</strong> sends your sign-in emails.
        </li>
        <li>
          <strong>Railway</strong> hosts the app and its database.
        </li>
      </ul>
      <p>We don&apos;t sell or share your data with anyone else, or use it for advertising.</p>

      <h2>In your browser</h2>
      <p>
        Your captions, styles and recent videos are saved in your browser&apos;s local storage so you can pick up where you left
        off. They stay on that device; clearing your browser data removes them.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Account, credit and payment records are kept while your account is open, and payment records as long as the law requires.
        Deleting your account deletes its data, including your word fixes.
      </p>

      <h2>Your rights</h2>
      <p>
        Under India&apos;s Digital Personal Data Protection Act, 2023, you can ask to see the personal data we hold about you,
        correct it, or delete your account and its data, and you can withdraw consent at any time. Email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we&apos;ll reply within 30 days. For grievances, write to the same address,
        addressed to {OPERATOR}.
      </p>

      <h2>Children</h2>
      <p>Lafz is for people 18 and over, or younger people using it with a parent or guardian&apos;s consent.</p>

      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, we&apos;ll update the date above and tell signed-in users by email.</p>
    </LegalPage>
  );
}
