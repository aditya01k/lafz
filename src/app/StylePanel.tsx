"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FONTS, FONT_FAMILIES, fontMeta, restoreCustomFonts, uploadFonts, type FontId } from "@/lib/fonts";
import { TEMPLATES, defaultStyle, templateById, type Style } from "@/lib/templates";
import { StyleLoop } from "./demo";

const MINE_KEY = "lafz:my-styles";
const SWATCHES = ["#ffffff", "#000000", "#ffe600", "#ffc531", "#ff5a36", "#ff4fd8", "#2ee6ff", "#3cff7a", "#7c5cff"];

/**
 * The full style editor. A preset sets every field; after that, any field can be changed,
 * and the result can be saved as one of "your styles" for the next video.
 */
export default function StylePanel({ style, onChange, frame }: { style: Style; onChange: (s: Style) => void; frame?: CanvasImageSource | null }) {
  const set = (patch: Partial<Style>) => onChange({ ...style, ...patch });
  const [mine, setMine] = useState<{ name: string; style: Style }[]>([]);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
      setMine(JSON.parse(localStorage.getItem(MINE_KEY) ?? "[]"));
    } catch {}
  }, []);
  const saveMine = (list: { name: string; style: Style }[]) => {
    setMine(list);
    try {
      localStorage.setItem(MINE_KEY, JSON.stringify(list));
    } catch {}
  };
  const preset = templateById(style.preset);
  const changed = JSON.stringify(style) !== JSON.stringify(preset.style);
  const meta = fontMeta(style.font);

  return (
    <div className="pb-10">
      <Section title="Presets">
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => onChange({ ...t.style, x: style.x, y: style.y, align: style.align, emojis: style.emojis, maxChars: style.maxChars, minDuration: style.minDuration, gap: style.gap })}
              className={`rounded-xl p-1 text-left ring-2 transition ${style.preset === t.id ? "ring-accent" : "ring-transparent hover:ring-white/15"}`}
            >
              <StyleLoop style={t.style} text="kya scene hai bhai" background={frame} className="block w-full rounded-lg" />
              <div className="px-1 pt-1.5 pb-0.5 text-[12px] font-medium">{t.name}</div>
              {t.credit && <div className="truncate px-1 pb-0.5 text-[11px] text-muted">by {t.credit.name}</div>}
            </button>
          ))}
        </div>
        {mine.length > 0 && (
          <>
            <div className="mt-4 mb-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">Your styles</div>
            <div className="flex flex-wrap gap-1.5">
              {mine.map((m, i) => (
                <span key={i} className="flex items-center rounded-full border border-hairline text-[12px]">
                  <button onClick={() => onChange(m.style)} className="py-1 pl-3 pr-1.5 hover:text-accent">
                    {m.name}
                  </button>
                  <button onClick={() => saveMine(mine.filter((_, j) => j !== i))} className="px-2 text-muted hover:text-foreground" aria-label={`Delete ${m.name}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          </>
        )}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => saveMine([...mine, { name: `${preset.name} ${mine.length + 1}`, style }].slice(-12))}
            className="h-8 rounded-full border border-hairline px-3 text-[12px] hover:border-white/25"
          >
            Save as my style
          </button>
          {changed && (
            <button onClick={() => onChange({ ...defaultStyle(style.preset), x: style.x, y: style.y, align: style.align })} className="h-8 rounded-full px-3 text-[12px] text-muted hover:text-foreground">
              Reset {preset.name}
            </button>
          )}
        </div>
      </Section>

      <Section title="Text">
        <FontPicker value={style.font} onChange={(font) => {
          const m = fontMeta(font);
          const weight = m.weights.reduce((best, w) => (Math.abs(w - style.weight) < Math.abs(best - style.weight) ? w : best), m.weights[0]);
          set({ font, weight, italic: style.italic && Boolean(m.italic) });
        }} />
        {meta.weights.length > 1 && (
          <Segmented label="Weight" value={String(style.weight)} options={meta.weights.map((w) => [String(w), weightName(w)])} onChange={(w) => set({ weight: Number(w) })} />
        )}
        <Segmented label="Case" value={style.case} options={[["as-is", "Aa"], ["upper", "AA"], ["lower", "aa"]]} onChange={(c) => set({ case: c as Style["case"] })} />
        {meta.italic && <Toggle label="Italic" on={style.italic} onChange={(italic) => set({ italic })} />}
        <Slider label="Size" value={style.size} min={0.03} max={0.16} step={0.002} show={`${Math.round(style.size * 1080)} px`} onChange={(size) => set({ size })} />
        <Slider label="Letter spacing" value={style.tracking} min={-0.05} max={0.2} step={0.005} show={`${Math.round(style.tracking * 100)}%`} onChange={(tracking) => set({ tracking })} />
      </Section>

      <Section title="Colour and highlight">
        <ColorRow label="Text" value={style.textColor} onChange={(textColor) => set({ textColor, rainbow: false })} />
        <Toggle label="Rainbow words" on={style.rainbow} onChange={(rainbow) => set({ rainbow })} />
        <Segmented
          label="Spoken word"
          value={style.highlight}
          options={[["color", "Colour"], ["box", "Box"], ["underline", "Underline"], ["none", "None"]]}
          onChange={(h) => set({ highlight: h as Style["highlight"] })}
        />
        {style.highlight !== "none" && (
          <>
            <ColorRow label="Highlight" value={style.highlightColor} onChange={(highlightColor) => set({ highlightColor })} />
            <Segmented
              label="Highlight"
              value={style.highlightScope}
              options={[["current", "Current word"], ["spoken", "All said so far"]]}
              onChange={(v) => set({ highlightScope: v as Style["highlightScope"] })}
            />
          </>
        )}
        <Slider label="Dim unsaid words" value={1 - style.dim} min={0} max={0.8} step={0.05} show={style.dim >= 1 ? "Off" : `${Math.round((1 - style.dim) * 100)}%`} onChange={(v) => set({ dim: 1 - v })} />
      </Section>

      <Section title="Outline and shadow">
        <Toggle label="Outline" on={style.outline} onChange={(outline) => set({ outline })} />
        {style.outline && (
          <>
            <ColorRow label="Outline colour" value={style.outlineColor} onChange={(outlineColor) => set({ outlineColor })} />
            <Slider label="Thickness" value={style.outlineWidth} min={0.04} max={0.35} step={0.01} show={`${Math.round(style.outlineWidth * 100)}`} onChange={(outlineWidth) => set({ outlineWidth })} />
          </>
        )}
        <Toggle label="Shadow or glow" on={style.shadow} onChange={(shadow) => set({ shadow })} />
        {style.shadow && (
          <>
            <ColorRow label="Shadow colour" value={style.shadowColor.slice(0, 7)} onChange={(shadowColor) => set({ shadowColor })} />
            <Slider label="Softness" value={style.shadowBlur} min={0.05} max={1} step={0.05} show={`${Math.round(style.shadowBlur * 100)}`} onChange={(shadowBlur) => set({ shadowBlur })} />
          </>
        )}
      </Section>

      <Section title="Background">
        <Segmented label="Behind" value={style.background} options={[["none", "None"], ["line", "Each line"], ["word", "Each word"]]} onChange={(b) => set({ background: b as Style["background"] })} />
        {style.background !== "none" && (
          <>
            <ColorRow label="Colour" value={style.backgroundColor} onChange={(backgroundColor) => set({ backgroundColor })} />
            <Slider label="Opacity" value={style.backgroundOpacity} min={0.1} max={1} step={0.05} show={`${Math.round(style.backgroundOpacity * 100)}%`} onChange={(backgroundOpacity) => set({ backgroundOpacity })} />
          </>
        )}
        {(style.background !== "none" || style.highlight === "box") && (
          <Slider label="Roundness" value={style.radius} min={0} max={0.7} step={0.02} show={`${Math.round(style.radius * 100)}`} onChange={(radius) => set({ radius })} />
        )}
      </Section>

      <Section title="Motion">
        <Segmented
          label="Animation"
          value={style.animation}
          options={[["none", "None"], ["pop", "Pop"], ["bounce", "Bounce"], ["fade", "Fade"], ["slide", "Slide"]]}
          onChange={(a) => set({ animation: a as Style["animation"] })}
        />
        <Toggle label="Show words only once said" on={style.reveal} onChange={(reveal) => set({ reveal })} />
      </Section>

      <Section title="Position">
        <div className="flex items-start gap-4">
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-hairline bg-background p-1" title="Snap to a spot">
            {[0.18, 0.5, 0.8].flatMap((y) =>
              [0.25, 0.5, 0.75].map((x) => {
                const on = Math.abs(style.x - x) < 0.02 && Math.abs(style.y - y) < 0.02;
                return (
                  <button
                    key={`${x}-${y}`}
                    aria-label={`Place at ${y < 0.4 ? "top" : y < 0.65 ? "middle" : "bottom"} ${x < 0.4 ? "left" : x < 0.6 ? "centre" : "right"}`}
                    onClick={() => set({ x, y, align: x < 0.4 ? "left" : x > 0.6 ? "right" : "center" })}
                    className={`size-6 rounded ${on ? "bg-accent" : "bg-white/10 hover:bg-white/25"}`}
                  />
                );
              }),
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-muted">Pick a spot, or drag the caption on the video. Turn on safe margins under the video to keep clear of the app&apos;s buttons.</p>
        </div>
        <Slider label="Up and down" value={style.y} min={0.05} max={0.95} step={0.005} show={style.y < 0.4 ? "Top" : style.y < 0.65 ? "Middle" : "Bottom"} onChange={(y) => set({ y })} />
        <Slider label="Left and right" value={style.x} min={0.1} max={0.9} step={0.005} show={Math.abs(style.x - 0.5) < 0.01 ? "Centre" : `${Math.round((style.x - 0.5) * 200)}`} onChange={(x) => set({ x })} />
        <Segmented label="Align" value={style.align} options={[["left", "Left"], ["center", "Centre"], ["right", "Right"]]} onChange={(a) => set({ align: a as Style["align"] })} />
        <Slider label="Text box width" value={style.maxWidth} min={0.3} max={0.96} step={0.01} show={`${Math.round(style.maxWidth * 100)}%`} onChange={(maxWidth) => set({ maxWidth })} />
      </Section>

      <Section title="Layout">
        <Slider label="Words per line" value={style.wordsPerLine} min={1} max={10} step={1} show={String(style.wordsPerLine)} onChange={(wordsPerLine) => set({ wordsPerLine })} />
        <Toggle label="Stack words (one per row)" on={style.stack} onChange={(stack) => set({ stack })} />
        <Toggle label="Emojis" on={style.emojis} onChange={(emojis) => set({ emojis })} />
      </Section>
    </div>
  );
}

const weightName = (w: number) => ({ 400: "Regular", 500: "Medium", 600: "Semibold", 700: "Bold", 800: "Extra", 900: "Black" })[w] ?? String(w);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-hairline px-4 py-5">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{title}</h3>
      {children}
    </section>
  );
}

function FontPicker({ value, onChange }: { value: FontId; onChange: (f: FontId) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  // Bumped when uploaded fonts are added, so the list re-reads FONTS.
  const [version, setVersion] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void restoreCustomFonts().then(() => setVersion((v) => v + 1));
  }, []);
  const groups = useMemo(() => {
    void version;
    const list = FONTS.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
    return [...new Set(list.map((f) => f.group))].map((g) => [g, list.filter((f) => f.group === g)] as const);
  }, [q, version]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={box} className="relative">
      <input
        ref={file}
        type="file"
        multiple
        accept=".ttf,.otf,.woff,.woff2"
        className="hidden"
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (!files.length) return;
          setUploadError("");
          try {
            const id = await uploadFonts(files);
            setVersion((v) => v + 1);
            onChange(id);
            setOpen(false);
          } catch {
            setUploadError("Some files aren't fonts this browser can read. Use .ttf, .otf or .woff2.");
          }
        }}
      />
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-hairline bg-black px-3.5 hover:border-white/25"
      >
        <span style={{ fontFamily: FONT_FAMILIES[value] }} className="text-[17px]">
          {fontMeta(value).name}
        </span>
        <span className="text-[12px] text-muted">Change</span>
      </button>
      <button
        onClick={() => file.current?.click()}
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 text-[13px] hover:border-white/40"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
        Upload fonts
      </button>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
        SF Pro, Editor&apos;s Note, Aston Script or any .ttf / .otf / .woff2. Pick all the weights at once. They stay in this browser.
      </p>
      {uploadError && <p className="mt-1.5 text-[12px] text-red-300">{uploadError}</p>}
      {open && (
        <div className="absolute inset-x-0 top-12 z-30 max-h-[420px] overflow-y-auto rounded-xl border border-hairline bg-surface p-2 shadow-2xl">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fonts"
            className="mb-2 h-9 w-full rounded-lg border border-hairline bg-black px-3 text-[13px] outline-none focus:border-white/25"
          />
          {groups.map(([g, fonts]) => (
            <div key={g} className="mb-1">
              <div className="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{g}</div>
              {fonts.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onChange(f.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-white/5 ${f.id === value ? "bg-white/10" : ""}`}
                >
                  <span style={{ fontFamily: FONT_FAMILIES[f.id], fontWeight: f.weights.at(-1) }} className="text-[18px]">
                    {f.name}
                  </span>
                  <span className="text-[11px] text-muted">
                    {f.kind === "licensed" ? "upload yours" : f.id === "sfpro" ? "on Apple devices" : f.kind === "system" ? "system font" : f.weights.length > 1 ? `${f.weights.length} weights` : ""}
                  </span>
                </button>
              ))}
            </div>
          ))}
          <p className="border-t border-hairline px-2 pt-3 pb-1 text-[11px] leading-relaxed text-muted">
            &ldquo;upload yours&rdquo; fonts are paid fonts we can&apos;t include: a close free face stands in until you upload
            your copy. Hindi, Tamil and other scripts get a matching Baloo face automatically.
          </p>
        </div>
      )}
    </div>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: (readonly [string, string])[] | [string, string][]; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] text-muted">{label}</div>
      <div className="flex gap-1 rounded-lg border border-hairline bg-black p-1">
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-[12px] transition ${value === v ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Slider(props: { label: string; value: number; min: number; max: number; step: number; show: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between text-[13px]">
        <span className="text-muted">{props.label}</span>
        <span className="font-mono text-[12px] tabular-nums">{props.show}</span>
      </div>
      <input type="range" className="mt-2 w-full" min={props.min} max={props.max} step={props.step} value={props.value} onChange={(e) => props.onChange(Number(e.target.value))} />
    </label>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between py-1 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition ${on ? "bg-accent" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] text-muted">{label}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            aria-label={c}
            className={`size-6 rounded-full border ${value.toLowerCase() === c ? "border-white ring-2 ring-white/40" : "border-white/15"}`}
            style={{ background: c }}
          />
        ))}
        <label className="relative flex size-6 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]" title="Custom colour">
          <input type="color" value={value.slice(0, 7)} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <span className="ml-1 font-mono text-[11px] text-muted">{value.slice(0, 7)}</span>
      </div>
    </div>
  );
}
