"use client";

import { useEffect, useRef, useState } from "react";
import { buildLines, type Line } from "@/lib/lines";
import { LOOKS, TEMPLATES, defaultStyle, drawCaptions, lineBudget, loadFonts, templateById, type Style, type TemplateId } from "@/lib/templates";
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

type Scene = { lang: string; text: string; template: TemplateId; colors: [string, string, string]; photo: string };

const SCENES: Scene[] = [
  { lang: "Hindi · English letters", text: "bhai yeh jagah ekdum mast hai", template: "headline", colors: ["#ff7a45", "#7a1f5c", "#1b0f2e"], photo: "selfie" },
  { lang: "Hindi · Hindi script", text: "आज हम गोवा जा रहे हैं", template: "editorial", colors: ["#1fb5a8", "#164a7a", "#0b1426"], photo: "lake" },
  { lang: "Tamil · English letters", text: "machi idhu semma place da", template: "typewriter", colors: ["#ffb347", "#c2410c", "#2a0f06"], photo: "platform" },
  { lang: "Punjabi · English letters", text: "oye chak de phatte yaar", template: "marker", colors: ["#9b5cff", "#2d1b69", "#0d0820"], photo: "train" },
  { lang: "Bengali · English letters", text: "ki darun jayga re", template: "editorial", colors: ["#2563eb", "#0f1f4d", "#05070f"], photo: "sunset" },
  { lang: "Marathi · English letters", text: "lai bhari", template: "headline", colors: ["#22c55e", "#14532d", "#04130a"], photo: "umbrella" },
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

// Stills from the creator's own reel (the top of each shot, above where their captions sat).
const photos = new Map<string, HTMLImageElement>();
function photo(name: string, kind: "tall" | "card"): HTMLImageElement | null {
  if (typeof Image === "undefined") return null;
  const key = `${name}-${kind}`;
  let img = photos.get(key);
  if (!img) {
    img = new Image();
    img.src = `/reels/${key}.jpg`;
    photos.set(key, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}

/** Draws a still, cover-fit, with a soft vignette so white captions read on bright skies. */
function still(ctx: CanvasRenderingContext2D, W: number, H: number, img: HTMLImageElement) {
  const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * k;
  const h = img.naturalHeight * k;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0.05)");
  g.addColorStop(0.5, "rgba(0,0,0,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/**
 * The hero phone: the creator's own reel playing, captioned live by the real renderer from the
 * real pipeline's words (public/reels/demo.json), one of the four styles per loop.
 */
const DEMO_STYLES = ["typewriter", "headline", "editorial", "marker"];

export function HeroDemo() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [styleIdx, setStyleIdx] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let words: Word[] = [];
    let raf = 0;
    let idx = 0;
    let last = 0;
    let alive = true;
    const prepare = () =>
      DEMO_STYLES.map((id) => {
        const style: Style = { ...defaultStyle(id) };
        style.size *= 1.15;
        const b = lineBudget(style);
        void loadFonts(style, words.map((w) => w.text).join(" "));
        return { style, lines: buildLines(words, b.maxWords, b.maxChars) };
      });
    let looks = prepare();
    void fetch("/reels/demo.json")
      .then((r) => r.json())
      .then((w: Word[]) => {
        if (!alive) return;
        words = w;
        looks = prepare();
      })
      .catch(() => {});
    const tick = () => {
      const c = canvas.current;
      const v = video.current;
      if (c && v) {
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, c.width, c.height);
        const t = v.currentTime;
        // Next style each time the clip loops back to the start.
        if (t + 0.25 < last) {
          idx = (idx + 1) % looks.length;
          setStyleIdx(idx);
        }
        last = t;
        drawCaptions(ctx, c.width, c.height, t, looks[idx].lines, looks[idx].style);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Some browsers ignore autoPlay until asked again; muted inline video is always allowed.
    void video.current?.play().catch(() => {});
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  const tpl = templateById(DEMO_STYLES[styleIdx]);
  return (
    <div className="relative mx-auto w-[min(300px,72vw)]">
      <div className="rounded-[44px] border border-white/10 bg-black p-2.5 shadow-[0_40px_120px_-20px_rgba(58,21,21,0.45)]">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[34px] bg-black">
          <video
            ref={video}
            src="/reels/demo.mp4"
            poster="/reels/demo-poster.jpg"
            autoPlay
            muted={muted}
            loop
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <canvas ref={canvas} width={540} height={960} className="pointer-events-none absolute inset-0 h-full w-full" />
          <button
            onClick={() => {
              setMuted((m) => !m);
              void video.current?.play();
            }}
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
            aria-label={muted ? "Turn sound on" : "Mute"}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7M19 5a10 10 0 010 14" /></svg>
            )}
          </button>
        </div>
      </div>
      <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-[#1d1714] px-3.5 py-1.5 text-[12px] font-medium text-white">
        <span className="size-1.5 rounded-full bg-accent" />
        Captioned by lafz
        <span className="text-white/55">· {tpl.name}</span>
      </div>
    </div>
  );
}

const CARD_PHOTOS = ["platform", "selfie", "lake", "train", "sunset", "umbrella"];

/** Type a line, watch it in every style. */
export function Playground() {
  const [text, setText] = useState("bhai yeh jagah ekdum mast hai");
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const data = useRef<{ lines: Line[]; length: number }[]>([]);

  useEffect(() => {
    CARD_PHOTOS.forEach((p) => photo(p, "card"));
    const words = speak(text || "kuch toh likho", 0.05);
    data.current = LOOKS.map((tpl) => {
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
      LOOKS.forEach((tpl, i) => {
        const c = refs.current[i];
        const d = data.current[i];
        if (!c || !d) return;
        const ctx = c.getContext("2d")!;
        const t = ((now - start) / 1000) % d.length;
        const img = photo(CARD_PHOTOS[i % CARD_PHOTOS.length], "card");
        if (img) still(ctx, c.width, c.height, img);
        else backdrop(ctx, c.width, c.height, now / 1000 + i, SCENES[i % SCENES.length].colors);
        // Subtitle-style looks keep their low position; the rest sit mid-card so they read.
        drawCaptions(ctx, c.width, c.height, t, d.lines, { ...tpl.style, y: tpl.style.y > 0.78 ? 0.8 : 0.55, size: tpl.style.size * 1.35 });
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
          className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 text-center text-[18px] font-medium text-[#1d1714] outline-none focus:border-black/30"
          aria-label="Type a line to preview"
        />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {LOOKS.map((tpl, i) => (
          <figure key={tpl.id}>
            <canvas
              ref={(el) => {
                refs.current[i] = el;
              }}
              width={360}
              height={480}
              className="block aspect-[3/4] w-full rounded-2xl shadow-[0_18px_40px_-24px_rgba(29,23,20,0.5)]"
            />
            <figcaption className="mt-2 px-1" title={tpl.blurb}>
              <span className="block text-[14px] font-semibold">{tpl.name}</span>
              {tpl.bestFor && <span className="block text-[12px] opacity-60">{tpl.bestFor}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/** A style looping a sample line: the editor's preset picker and live preview cards. */
export function StyleLoop({
  style,
  text,
  className,
  background,
}: {
  style: Style;
  text: string;
  className?: string;
  /** A still from the creator's own video; falls back to a soft gradient. */
  background?: CanvasImageSource | null;
}) {
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
      if (background) ctx.drawImage(background, 0, 0, c.width, c.height);
      else backdrop(ctx, c.width, c.height, now / 1000, colors);
      drawCaptions(ctx, c.width, c.height, ((now - start) / 1000) % length, lines, s);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [style, text, background]);
  return <canvas ref={ref} width={240} height={300} className={className} />;
}
