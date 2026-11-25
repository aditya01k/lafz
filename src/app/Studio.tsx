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
};

type Phase =
  | { kind: "upload"; error?: string }
  | { kind: "working"; step: 0 | 1 | 2; name: string }
  | { kind: "edit"; project: Project };

const cacheKey = (f: File) => `lafz:${f.name}:${f.size}:${f.lastModified}`;

export default function Studio() {
  const [phase, setPhase] = useState<Phase>({ kind: "upload" });
  const account = useAccount();


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
        account.openBuy(`This video needs ${minutesLabel(json.needed ?? 0)} and you have ${minutesLabel(json.seconds ?? 0)}.`);
      }
      if (!res.ok) throw new Error(json.error ?? "Transcription failed.");
      if (json.seconds !== undefined) account.setSeconds(json.seconds);
      if (!json.words.length) throw new Error("We couldn't hear any speech in this video.");
      const project: Project = { file, url, key, words: json.words, style: defaultStyle(), duration, language: opts.language, script: opts.script };
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
      error={phase.kind === "upload" ? phase.error : undefined}
      working={phase.kind === "working" ? { step: phase.step, name: phase.name } : undefined}
    />
  );
}

function readSaved(key: string): Pick<Project, "words" | "style" | "duration" | "language" | "script"> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Pick<Project, "words" | "style" | "duration" | "language" | "script">;
    return { ...saved, style: normalizeStyle(saved.style) };
  } catch {
    return null;
  }
}

function save(p: Project) {
  try {
    localStorage.setItem(p.key, JSON.stringify({ words: p.words, style: p.style, duration: p.duration, language: p.language, script: p.script }));
  } catch {
    // Storage full or blocked: the edit still works, it just won't survive a refresh.
  }
}
