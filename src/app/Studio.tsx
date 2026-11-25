"use client";

import { useState } from "react";
import { extractWav } from "@/lib/audio";
import { restoreCustomFonts } from "@/lib/fonts";
import { minutesLabel } from "@/lib/pricing";
import { defaultStyle, normalizeStyle, type Style } from "@/lib/templates";
import type { TranscribeResult, Word } from "@/lib/types";
import { useAccount } from "./Account";
import Editor from "./Editor";
import "./fonts";
import Home, { rememberRecent } from "./app/Home";

const MAX_SECONDS = 5 * 60;

export type Project = {
  file: File;
  url: string;
  words: Word[];
  style: Style;
  duration: number;
  key: string;
  /** What it was captioned in (older saved projects don't have these). */
  language?: string;
  script?: "latin" | "native";
  /** Hosted: this video on the account. Charged at first export; then `unlocked`. */
  videoId?: string;
  unlocked?: boolean;
  /** The bundled sample reel: free to edit and export. */
  sample?: boolean;
};

type Phase =
  | { kind: "upload"; error?: string }
  | { kind: "working"; step: 0 | 1 | 2; name: string }
  | { kind: "edit"; project: Project };

const cacheKey = (f: File) => `lafz:${f.name}:${f.size}:${f.lastModified}`;

export default function Studio() {
  const [phase, setPhase] = useState<Phase>({ kind: "upload" });
  const account = useAccount();

  /** The sample reel, straight into the editor: no upload, no transcription, no charge. */
  async function openSample() {
    try {
      setPhase({ kind: "working", step: 0, name: "Sample reel" });
      const [blob, words] = await Promise.all([fetch("/reels/demo.mp4").then((r) => r.blob()), fetch("/reels/demo.json").then((r) => r.json() as Promise<Word[]>)]);
      const file = new File([blob], "sample-reel.mp4", { type: "video/mp4", lastModified: 1 });
      const key = `${cacheKey(file)}:hindi:latin`;
      const saved = readSaved(key);
      const project: Project = saved
        ? { file, url: URL.createObjectURL(file), key, ...saved, sample: true }
        : { file, url: URL.createObjectURL(file), key, words, style: defaultStyle(), duration: 10.2, language: "hindi", script: "latin", sample: true };
      save(project);
      setPhase({ kind: "edit", project });
    } catch {
      setPhase({ kind: "upload", error: "The sample couldn't load. Try again." });
    }
  }

  /**
   * Pay on export: the first export of a hosted video charges its minutes. Not enough credits
   * opens checkout in a new tab and carries on here once they arrive, so the edit is never lost.
   */
  async function unlock(p: Project): Promise<boolean> {
    if (!account.me?.billing || p.sample || p.unlocked || !p.videoId) return true;
    const res = await fetch("/api/videos/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.videoId }) });
    const j = (await res.json().catch(() => ({}))) as { seconds?: number; code?: string; needed?: number; error?: string };
    if (res.ok) {
      if (j.seconds !== undefined) account.setSeconds(j.seconds);
      const next = { ...p, unlocked: true };
      save(next);
      setPhase((ph) => (ph.kind === "edit" ? { kind: "edit", project: { ...ph.project, unlocked: true } } : ph));
      return true;
    }
    if (j.code === "signin") {
      location.href = "/login?next=/app";
      return false;
    }
    if (j.code === "credits") {
      account.setSeconds(j.seconds ?? 0);
      return new Promise((resolve) =>
        account.openBuy(`Exporting this video uses ${minutesLabel(j.needed ?? 0)}. You have ${minutesLabel(j.seconds ?? 0)}.`, {
          needed: j.needed ?? 0,
          onPaid: () => void unlock(p).then(resolve),
        }),
      );
    }
    throw new Error(j.error ?? "Couldn't start the export.");
  }


  async function start(file: File, opts: { dictionary: string; language: string; script: "latin" | "native" }) {
    const key = `${cacheKey(file)}:${opts.language}:${opts.script}`;
    const url = URL.createObjectURL(file);
    // Same file again (after a refresh): reopen the saved edit, no second transcription.
    const saved = readSaved(key);
    // A saved style may use a font uploaded in an earlier session.
    await restoreCustomFonts();
    if (saved) {
      rememberRecent({ key, name: file.name, duration: saved.duration, language: saved.language, script: saved.script, at: Date.now() });
      setPhase({ kind: "edit", project: { file, url, key, ...saved } });
      return;
    }
    // Hosted: a session that expired mid-visit goes back to the sign-in page.
    if (account.me?.billing && !account.me.user) {
      URL.revokeObjectURL(url);
      location.href = "/login?next=/app";
      return;
    }
    try {
      setPhase({ kind: "working", step: 0, name: file.name });
      const { wav, duration } = await extractWav(file);
      if (duration > MAX_SECONDS + 1) throw new Error("Videos can be up to 5 minutes long for now.");
      setPhase({ kind: "working", step: 1, name: file.name });
      const form = new FormData();
      form.append("audio", wav, "audio.wav");
      form.append("dictionary", opts.dictionary);
      form.append("language", opts.language);
      form.append("script", opts.script);
      const timer = setTimeout(() => setPhase({ kind: "working", step: 2, name: file.name }), 6000);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      clearTimeout(timer);
      const json = (await res.json()) as TranscribeResult & { error?: string; code?: string; needed?: number };
      if (json.code === "signin") location.href = "/login?next=/app";
      if (json.code === "credits") {
        account.setSeconds(json.seconds ?? 0);
        account.openBuy(json.error);
      }
      if (!res.ok) throw new Error(json.error ?? "Transcription failed.");
      if (json.seconds !== undefined) account.setSeconds(json.seconds);
      if (!json.words.length) throw new Error("We couldn't hear any speech in this video.");
      const project: Project = { file, url, key, words: json.words, style: defaultStyle(), duration, language: opts.language, script: opts.script, videoId: json.videoId };
      save(project);
      rememberRecent({ key, name: file.name, duration, language: opts.language, script: opts.script, at: Date.now() });
      setPhase({ kind: "edit", project });
    } catch (err) {
      URL.revokeObjectURL(url);
      setPhase({ kind: "upload", error: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  if (phase.kind === "edit") {
    return (
      <Editor
        project={phase.project}
        beforeExport={() => unlock(phase.project)}
        onChange={(p) => save(p)}
        onClose={() => {
          URL.revokeObjectURL(phase.project.url);
          setPhase({ kind: "upload" });
        }}
      />
    );
  }
  return (
    <Home
      onFile={start}
      onSample={openSample}
      error={phase.kind === "upload" ? phase.error : undefined}
      working={phase.kind === "working" ? { step: phase.step, name: phase.name } : undefined}
    />
  );
}

type Saved = Pick<Project, "words" | "style" | "duration" | "language" | "script" | "videoId" | "unlocked">;

function readSaved(key: string): Saved | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    return { ...saved, style: normalizeStyle(saved.style) };
  } catch {
    return null;
  }
}

function save(p: Project) {
  try {
    localStorage.setItem(
      p.key,
      JSON.stringify({ words: p.words, style: p.style, duration: p.duration, language: p.language, script: p.script, videoId: p.videoId, unlocked: p.unlocked }),
    );
  } catch {
    // Storage full or blocked: the edit still works, it just won't survive a refresh.
  }
}
