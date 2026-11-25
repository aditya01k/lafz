# Lafz

Open-source captions for every Indian language. Hinglish, Tanglish and 10 more, spelled the way creators actually type ("yaar kya scene hai", not "Your car seen hey"), timed word by word, in 10 creator styles.

**Free to run on your own machine.** Every feature, no account, no limits: you pay Sarvam and OpenAI directly for your own usage (about ₹1 per minute of video). Don't want to run it? The hosted version is pay per minute with prepaid credits.

## What it does

- **Upload** an MP4 or MOV (up to 5 minutes). The soundtrack is pulled out in the browser as 16 kHz mono WAV, so only ~2 MB per minute leaves the device.
- **Languages**: Hinglish (live), plus Hindi in Devanagari, Tanglish, Punjabi, Bengali, Marathi, Gujarati, Telugu, Kannada, Malayalam, Urdu and Odia in beta.
- **Transcribe**: Whisper (`whisper-1`) supplies per-word timing. If `SARVAM_API_KEY` is set, Sarvam `saaras:v4` supplies the text (`translit` for Roman script, `codemix` for native script with English left in English), mapped onto Whisper's timing. Then a GPT pass fixes spellings word for word, applies the creator's dictionary and suggests emojis.
- **Edit**: tap any word to rewrite, highlight, delete, split it with a space, start a new line, add a word after it, or nudge its line ±0.1 s. Find and replace, undo/redo (⌘Z / ⇧⌘Z), space to play.
- **Style**: 10 templates (Pop, Punch, Karaoke, Bubble, Classic, Minimal, Bazaar, Neon, Typewriter, Headline), with size, position, words per line, ALL CAPS, emojis and colours.
- **Export**, all in the browser through WebCodecs ([Mediabunny](https://mediabunny.dev)): burned-in MP4 with the original audio, transparent WebM (VP9 alpha) for Premiere/DaVinci/Final Cut, green-screen MP4, SRT, VTT and a plain transcript.

Rendering happens on the user's device, so the only per-video cost is transcription (about ₹0.50 a minute with Sarvam, plus Whisper and the spelling pass).

## Run it locally

```bash
git clone https://github.com/aditya01k/lafz && cd lafz
pnpm install
cp .env.example .env.local   # add OPENAI_API_KEY, optionally SARVAM_API_KEY
pnpm dev                     # http://localhost:3300
```

Export needs a browser with WebCodecs (Chrome, Edge, Safari 17+). Transparent export needs VP9 alpha encoding, which Chrome has.

## Layout

| Path | What |
| --- | --- |
| `src/app/api/transcribe/route.ts` | Whisper timing → Sarvam text (optional) → spelling pass |
| `src/server/` | Engine clients, WAV slicing, per-IP rate limit |
| `src/lib/templates.ts` | The one caption renderer used by preview and every export |
| `src/lib/lines.ts` | Words → caption lines, SRT/VTT |
| `src/lib/export.ts` | Browser-side MP4 / WebM / green-screen export |
| `src/app/Editor.tsx` | Preview, timeline, word editor |

Transcription is capped at 20 audio minutes per IP per hour until accounts exist.

## License

[AGPL-3.0](LICENSE). Use it, self-host it, change it. If you run a modified version as a public service, publish your changes under the same license.
