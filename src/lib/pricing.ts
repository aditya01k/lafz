/**
 * Hosted pricing: prepaid credits, counted in seconds of video, ₹4 a minute (set 2026-11-25 to
 * undercut Kalakar's Editor plan, ~₹5/min list). Costs about ₹1.64/min (Sarvam, Whisper, the
 * spelling pass, with GST); about ₹2.9/min is kept after GST and Dodo's fee, so ~₹1.3/min margin.
 * Credits never expire. Self-hosted copies don't use any of this.
 *
 * Pack ids name their minutes: a Dodo product is made per id, so a new price needs new ids.
 */
export const RUPEES_PER_MINUTE = 4;

export type Pack = { id: string; rupees: number; minutes: number };

export const PACKS: Pack[] = [
  { id: "m50", rupees: 200, minutes: 50 },
  { id: "m125", rupees: 500, minutes: 125 },
  { id: "m250", rupees: 1000, minutes: 250 },
];

export const packById = (id: string) => PACKS.find((p) => p.id === id);

/** "12.5 min" from seconds, for balances and costs. */
export const minutesLabel = (seconds: number) => {
  const m = Math.max(0, seconds) / 60;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.floor(m)} min`;
};
