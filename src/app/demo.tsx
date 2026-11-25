"use client";

import { useEffect, useRef, useState } from "react";
import { buildLines, type Line } from "@/lib/lines";
import { TEMPLATES, defaultStyle, drawCaptions, lineBudget, loadFonts, templateById, type Style, type TemplateId } from "@/lib/templates";
import "./fonts";
import type { Word } from "@/lib/types";

/** Times a sentence like natural speech: longer words take longer. */
export function speak(text: string, at = 0): Word[] {
  let t = at;
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      const dur = 0.2 + Math.min(0.32, w.length * 0.035);
      const word = { id: `d${i}`, text: w, start: t, end: t + dur };
      t += dur + 0.05;
      return word;
    });
}

type Scene = { lang: string; text: string; template: TemplateId; colors: [string, string, string] };

const SCENES: Scene[] = [
  { lang: "Hindi · English letters", text: "bhai yeh jagah ekdum mast hai", template: "clean", colors: ["#ff7a45", "#7a1f5c", "#1b0f2e"] },
  { lang: "Hindi · Hindi script", text: "आज हम गोवा जा रहे हैं", template: "editorial", colors: ["#1fb5a8", "#164a7a", "#0b1426"] },
  { lang: "Tamil · English letters", text: "machi idhu semma place da", template: "typewriter", colors: ["#ffb347", "#c2410c", "#2a0f06"] },
  { lang: "Punjabi · English letters", text: "oye chak de phatte yaar", template: "marker", colors: ["#9b5cff", "#2d1b69", "#0d0820"] },
  { lang: "Bengali · English letters", text: "ki darun jayga re", template: "script", colors: ["#2563eb", "#0f1f4d", "#05070f"] },
  { lang: "Marathi · English letters", text: "lai bhari", template: "headline", colors: ["#22c55e", "#14532d", "#04130a"] },
];

function backdrop(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, c: [string, string, string]) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, c[1]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Two slow light blobs so it reads as footage, not a flat card.
  const blob = (x: number, y: number, r: number, color: string) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  };
  ctx.globalAlpha = 0.75;
  blob(W * (0.3 + 0.1 * Math.sin(t * 0.5)), H * (0.28 + 0.05 * Math.cos(t * 0.4)), W * 0.75, c[0]);
  ctx.globalAlpha = 0.35;
  blob(W * (0.8 + 0.08 * Math.cos(t * 0.3)), H * 0.75, W * 0.6, c[0]);
  ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, H * 0.75);
  v.addColorStop(0, "transparent");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

/** The hero phone: every language, every style, drawn live by the real renderer. */
export function HeroDemo() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const prepared = SCENES.map((s) => {
      const words = speak(s.text, 0.35);
      const style: Style = { ...defaultStyle(s.template), y: 0.62 };
      style.size *= 1.25;
      const b = lineBudget(style);
      void loadFonts(style, s.text);
      return {
        ...s,
        lines: buildLines(words, b.maxWords, b.maxChars),
        style,
        length: words.at(-1)!.end + 1.1,
      };
    });
    let raf = 0;
    let idx = 0;
    let t0 = performance.now();
    const tick = (now: number) => {
      const c = canvas.current;
      if (c) {
        const ctx = c.getContext("2d")!;
        const cur = prepared[idx];
        let t = (now - t0) / 1000;
        if (t > cur.length) {
          idx = (idx + 1) % prepared.length;
          setScene(idx);
          t0 = now;
          t = 0;
        }
        backdrop(ctx, c.width, c.height, now / 1000, prepared[idx].colors);
        drawCaptions(ctx, c.width, c.height, t, prepared[idx].lines, prepared[idx].style);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = SCENES[scene];
  const tpl = templateById(s.template);
  return (
    <div className="relative mx-auto w-[min(300px,72vw)]">
      <div className="rounded-[44px] border border-white/10 bg-black p-2.5 shadow-[0_40px_120px_-20px_rgba(255,197,49,0.25)]">
        <canvas ref={canvas} width={540} height={960} className="block aspect-[9/16] w-full rounded-[34px]" />
      </div>
      <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-hairline bg-surface/90 px-3.5 py-1.5 text-[12px] font-medium backdrop-blur">
        <span className="size-1.5 rounded-full bg-accent" />
        {s.lang}
        <span className="text-muted">· {tpl.name}</span>
      </div>
    </div>
  );
}

/** Type a line, watch it in every style. */
export function Playground() {
  const [text, setText] = useState("bhai yeh jagah ekdum mast hai");
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const data = useRef<{ lines: Line[]; length: number }[]>([]);

  useEffect(() => {
    const words = speak(text || "kuch toh likho", 0.05);
    data.current = TEMPLATES.map((tpl) => {
      const b = lineBudget(tpl.style);
      void loadFonts(tpl.style, text);
      return { lines: buildLines(words, b.maxWords, b.maxChars), length: words.at(-1)!.end + 0.3 };
    });
  }, [text]);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 33) return; // 30 fps is plenty for the small previews
      last = now;
      TEMPLATES.forEach((tpl, i) => {
        const c = refs.current[i];
        const d = data.current[i];
        if (!c || !d) return;
        const ctx = c.getContext("2d")!;
        const t = ((now - start) / 1000) % d.length;
        backdrop(ctx, c.width, c.height, now / 1000 + i, SCENES[i % SCENES.length].colors);
        drawCaptions(ctx, c.width, c.height, t, d.lines, { ...tpl.style, y: 0.55, size: tpl.style.size * 1.35 });
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div>
      <div className="mx-auto max-w-xl">
        <input
          value={text}
          maxLength={60}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-2xl border border-hairline bg-surface px-5 py-4 text-center text-[18px] font-semibold outline-none focus:border-accent"
          aria-label="Type a line to preview"
        />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {TEMPLATES.map((tpl, i) => (
          <figure key={tpl.id}>
            <canvas
              ref={(el) => {
                refs.current[i] = el;
              }}
              width={360}
              height={480}
              className="block aspect-[3/4] w-full rounded-2xl"
            />
            <figcaption className="mt-2 px-1" title={tpl.blurb}>
              <span className="text-[14px] font-semibold">{tpl.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/** A style looping a sample line: the editor's preset picker and live preview cards. */
export function StyleLoop({ style, text, className }: { style: Style; text: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const words = speak(text, 0.05);
    const b = lineBudget(style);
    const lines = buildLines(words, b.maxWords, b.maxChars);
    const length = words.at(-1)!.end + 0.3;
    const s = { ...style, y: 0.55, size: style.size * 1.6 };
    const colors = SCENES[Math.max(0, TEMPLATES.findIndex((x) => x.id === style.preset)) % SCENES.length].colors;
    void loadFonts(style, text);
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 40) return;
      last = now;
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext("2d")!;
      backdrop(ctx, c.width, c.height, now / 1000, colors);
      drawCaptions(ctx, c.width, c.height, ((now - start) / 1000) % length, lines, s);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [style, text]);
  return <canvas ref={ref} width={240} height={300} className={className} />;
}
