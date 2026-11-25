"use client";

import { LOOKS, templateById, type Style } from "@/lib/templates";
import { StyleLoop } from "../demo";

/**
 * For people who don't edit: pick a look, set size and place, export. No timeline, no
 * thirty sliders. Everything here is also reachable in Pro mode.
 */

const SIZES: [string, number][] = [
  ["Small", 0.82],
  ["Medium", 1],
  ["Large", 1.22],
];
const PLACES: [string, number][] = [
  ["Top", 0.22],
  ["Middle", 0.5],
  ["Bottom", 0.74],
];
const ACCENTS = ["#ffe14d", "#8cf5b4", "#7cc8ff", "#ff8ad8", "#ff7a45", "#ffffff"];

export default function Simple({
  style,
  setStyle,
  frame,
  sample,
  onExport,
}: {
  style: Style;
  setStyle: (s: Style) => void;
  frame: HTMLCanvasElement | null;
  /** A few words from the creator's own video, for the previews. */
  sample: string;
  onExport: () => void;
}) {
  const base = templateById(style.preset).style;
  const scale = style.size / base.size;
  const sizeIdx = SIZES.reduce((best, [, k], i) => (Math.abs(k - scale) < Math.abs(SIZES[best][1] - scale) ? i : best), 1);
  const place = PLACES.reduce((best, [, y], i) => (Math.abs(y - style.y) < Math.abs(PLACES[best][1] - style.y) ? i : best), 0);
  const seg = (on: boolean) => `flex-1 rounded-lg py-2 text-[13px] font-medium ${on ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`;

  return (
    <div className="flex min-h-full flex-col">
      <div className="p-4">
        <h2 className="text-[15px] font-semibold">Pick a look</h2>
        <p className="mt-0.5 text-[12px] text-muted">Shown on your own video. You can change it any time.</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {LOOKS.map((t) => {
            const on = style.preset === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setStyle({ ...t.style, size: t.style.size * SIZES[sizeIdx][1], y: style.y === base.y ? t.style.y : style.y, x: 0.5, align: "center", emojis: style.emojis })}
                className={`rounded-xl p-1.5 text-left transition ${on ? "bg-accent/15 ring-2 ring-accent" : "bg-raised hover:bg-white/10"}`}
              >
                <StyleLoop style={t.style} text={sample} background={frame} className="block aspect-[4/5] w-full rounded-lg" />
                <div className="px-1 pb-0.5 pt-2">
                  <div className="text-[13px] font-semibold">{t.name}</div>
                  <div className="truncate text-[11px] text-muted">{t.bestFor ?? t.blurb}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 border-t border-hairline p-4">
        <div>
          <div className="mb-1.5 text-[12px] text-muted">Size</div>
          <div className="flex gap-1 rounded-xl border border-hairline bg-background p-1">
            {SIZES.map(([name, k], i) => (
              <button key={name} onClick={() => setStyle({ ...style, size: base.size * k })} className={seg(i === sizeIdx)}>
                {name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[12px] text-muted">Place</div>
          <div className="flex gap-1 rounded-xl border border-hairline bg-background p-1">
            {PLACES.map(([name, y], i) => (
              <button key={name} onClick={() => setStyle({ ...style, y, x: 0.5, align: "center" })} className={seg(i === place)}>
                {name}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">Or drag the caption on the video.</p>
        </div>
        <div>
          <div className="mb-1.5 text-[12px] text-muted">Highlight colour</div>
          <div className="flex gap-2">
            {ACCENTS.map((c) => (
              <button
                key={c}
                aria-label={`Highlight ${c}`}
                onClick={() => setStyle({ ...style, highlightColor: c, highlight: style.highlight === "none" ? "color" : style.highlight })}
                className={`size-8 rounded-full border-2 ${style.highlight !== "none" && style.highlightColor.toLowerCase() === c ? "border-white" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
            <button
              onClick={() => setStyle({ ...style, highlight: "none" })}
              className={`h-8 rounded-full px-3 text-[12px] ${style.highlight === "none" ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`}
            >
              None
            </button>
          </div>
        </div>
        <label className="flex items-center justify-between text-[13px]">
          <span>Emojis</span>
          <input type="checkbox" checked={style.emojis} onChange={(e) => setStyle({ ...style, emojis: e.target.checked })} className="size-4 accent-[var(--accent)]" />
        </label>
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-hairline bg-surface p-4">
        <button onClick={onExport} className="h-12 w-full rounded-full bg-accent text-[15px] font-semibold text-accent-ink">
          Export video
        </button>
      </div>
    </div>
  );
}
