/**
 * Hosted pricing: prepaid credits, counted in seconds of video, ₹10 a minute (set 2026-11-25;
 * ~₹1.1–1.6 a minute of cost, ~₹7.3–7.8 kept after GST and Dodo's fee). Credits never expire.
 * Self-hosted copies don't use any of this.
 *
 * Pack ids name their minutes: a Dodo product is made per id, so a new price needs new ids.
 */
export const RUPEES_PER_MINUTE = 10;

export type Pack = { id: string; rupees: number; minutes: number };

export const PACKS: Pack[] = [
  { id: "m20", rupees: 200, minutes: 20 },
  { id: "m50", rupees: 500, minutes: 50 },
  { id: "m100", rupees: 1000, minutes: 100 },
];

export const packById = (id: string) => PACKS.find((p) => p.id === id);

/** "12.5 min" from seconds, for balances and costs. */
export const minutesLabel = (seconds: number) => {
  const m = Math.max(0, seconds) / 60;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.floor(m)} min`;
};
