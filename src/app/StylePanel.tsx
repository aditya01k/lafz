"use client";

import { useEffect, useRef } from "react";
import { buildLines } from "@/lib/lines";
import { TEMPLATES, defaultStyle, drawCaptions, loadFonts, templateById, type Style, type Template } from "@/lib/templates";
import type { Word } from "@/lib/types";

// A sample line for the template thumbnails, timed so the second word is mid-pop.
const SAMPLE: Word[] = ["kya", "scene", "hai", "bhai"].map((text, i) => ({
  id: `s${i}`,
  text,
  start: i * 0.3,
  end: i * 0.3 + 0.28,
}));

function Thumb({ tpl }: { tpl: Template }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    void loadFonts().then(() => {
      const c = ref.current;
      if (!alive || !c) return;
      const ctx = c.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, "#3a3f4b");
      g.addColorStop(1, "#16181d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, c.width, c.height);
      // Bigger than real life so the style reads at thumbnail size.
      const style = { ...defaultStyle(tpl.id), y: 0.5, size: 1.7 };
      const lines = buildLines(SAMPLE, tpl.maxWords, tpl.maxChars);
      drawCaptions(ctx, c.width, c.height, 0.47, lines, style);
    });
    return () => {
      alive = false;
    };
  }, [tpl]);
  return <canvas ref={ref} width={270} height={300} className="block w-full rounded-lg" />;
}

export default function StylePanel({ style, onChange }: { style: Style; onChange: (s: Style) => void }) {
  const tpl = templateById(style.template);
  const set = (patch: Partial<Style>) => onChange({ ...style, ...patch });
  const label = "text-[12px] font-medium uppercase tracking-wide text-muted";

  return (
    <div className="space-y-6 p-4">
      <section>
        <h3 className={label}>Template</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() =>
                // Switching template takes its defaults but keeps the creator's size and emoji choice.
                onChange({ ...defaultStyle(t.id), size: style.size, emojis: style.emojis })
              }
              className={`rounded-xl p-1 text-left ring-2 transition ${
                style.template === t.id ? "ring-accent" : "ring-transparent hover:ring-white/15"
              }`}
            >
              <Thumb tpl={t} />
              <div className="px-1 pt-1.5 pb-0.5 text-[12px] font-semibold">{t.name}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted">{tpl.blurb}</p>
      </section>

      <section className="space-y-4">
        <Slider label="Size" value={style.size} min={0.5} max={1.8} step={0.05} onChange={(size) => set({ size })} show={`${Math.round(style.size * 100)}%`} />
        <Slider label="Position" value={style.y} min={0.1} max={0.92} step={0.01} onChange={(y) => set({ y })} show={style.y < 0.4 ? "Top" : style.y < 0.65 ? "Middle" : "Bottom"} />
        <Slider
          label="Words per line"
          value={style.wordsPerLine ?? tpl.maxWords}
          min={1}
          max={10}
          step={1}
          onChange={(n) => set({ wordsPerLine: n })}
          show={String(style.wordsPerLine ?? tpl.maxWords)}
        />
      </section>

      <section className="space-y-2">
        <Toggle label="ALL CAPS" on={style.uppercase} onChange={(uppercase) => set({ uppercase })} />
        <Toggle label="Emojis" on={style.emojis} onChange={(emojis) => set({ emojis })} />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Color label="Text" value={style.textColor ?? tpl.text} onChange={(textColor) => set({ textColor })} />
        <Color label="Highlight" value={style.highlightColor ?? tpl.hi} onChange={(highlightColor) => set({ highlightColor })} />
      </section>
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  show: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-[13px]">
        <span className="font-medium">{props.label}</span>
        <span className="tabular-nums text-muted">{props.show}</span>
      </div>
      <input
        type="range"
        className="mt-2 w-full"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between rounded-xl bg-raised px-4 py-3 text-[14px] font-medium">
      {label}
      <span className={`relative h-6 w-10 rounded-full transition ${on ? "bg-accent" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl bg-raised px-3 py-2.5 text-[14px] font-medium">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded-md border-0 bg-transparent p-0" />
      {label}
    </label>
  );
}
