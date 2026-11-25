/**
 * Hosted pricing: prepaid credits, counted in seconds of video, ₹2 a minute.
 * Credits never expire. Self-hosted copies don't use any of this.
 */
export const RUPEES_PER_MINUTE = 2;

export type Pack = { id: "p200" | "p500" | "p1000"; rupees: number; minutes: number };

export const PACKS: Pack[] = [
  { id: "p200", rupees: 200, minutes: 100 },
  { id: "p500", rupees: 500, minutes: 250 },
  { id: "p1000", rupees: 1000, minutes: 500 },
];

export const packById = (id: string) => PACKS.find((p) => p.id === id);

/** "12.5 min" from seconds, for balances and costs. */
export const minutesLabel = (seconds: number) => {
  const m = Math.max(0, seconds) / 60;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.floor(m)} min`;
};
