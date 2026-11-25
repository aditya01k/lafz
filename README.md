# Lafz

Open-source captions for 11 Indian languages, in English letters ("yaar kya scene hai", not "Your car seen hey") or their own script, timed word by word, in fully customisable styles.

**Free to run on your own machine.** Every feature, no account, no limits: you pay Sarvam and OpenAI directly for your own usage (about ₹1 per minute of video). Don't want to run it? The hosted version is pay per minute with prepaid credits.

## What it does

- **Upload** an MP4 or MOV (up to 5 minutes). The soundtrack is pulled out in the browser as 16 kHz mono WAV, so only ~2 MB per minute leaves the device.
- **Languages**: Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Urdu and Odia, each in English letters ("kya scene hai") or its own script ("क्या सीन है"), with English words kept in English.
- **Transcribe**: Whisper (`whisper-1`) supplies per-word timing. If `SARVAM_API_KEY` is set, Sarvam `saaras:v4` supplies the text (`translit` for Roman script, `codemix` for native script with English left in English), mapped onto Whisper's timing. Then a GPT pass fixes spellings word for word, applies the creator's dictionary and suggests emojis.
- **Edit**: tap any word to rewrite, highlight, delete, split it with a space, start a new line, add a word after it, or nudge its line ±0.1 s. Find and replace, undo/redo (⌘Z / ⇧⌘Z), space to play.
- **Style**: 4 presets (Typewriter, Headline, Editorial, Marker) as starting points; every setting is editable: font (SF Pro, Editor's Note, Anton, Aston Script, Times New Roman, plus 25 trending Google Fonts; paid fonts use your installed or uploaded copy, with a free stand-in until then), weight, size, spacing, case, colours, highlight, outline, shadow, background, animation and layout. Indian scripts get matching Baloo faces automatically; Urdu runs right to left.
- **Export**, all in the browser through WebCodecs ([Mediabunny](https://mediabunny.dev)): burned-in MP4 with the original audio, transparent WebM (VP9 alpha) for Premiere/DaVinci/Final Cut, green-screen MP4, SRT, VTT and a plain transcript.

Rendering happens on the user's device, so the only per-video cost is transcription (about ₹0.50 a minute with Sarvam, plus Whisper and the spelling pass).

## Run it locally

```bash
git clone https://github.com/aditya01k/lafz && cd lafz
pnpm install
cp .env.example .env.local   # add OPENAI_API_KEY and SARVAM_API_KEY
pnpm dev                     # http://localhost:3300
```

Or with Docker:

```bash
docker build -f docker/Dockerfile -t lafz .
docker run -p 3000:3000 --env-file .env.local lafz
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

## Hosted mode

Set `DATABASE_URL` and `BETTER_AUTH_SECRET` and the app turns on sign-in (email link or Google) and prepaid credits: ₹4 per minute of video, sold in packs through Dodo Payments (`src/lib/pricing.ts`). Credits are a ledger in Postgres (`src/server/credits.ts`); a transcription is charged up front and refunded if it fails. Tables are created on boot. Point Dodo's webhook at `/api/dodo/webhook`.

Leave those unset and every feature is free with no sign-in, which is what you want on your own machine.

## Contributing

Add a caption style (one JSON file, credited to you), improve a language, or benchmark accuracy:
see [CONTRIBUTING.md](CONTRIBUTING.md). Found a security issue? See [SECURITY.md](SECURITY.md).

## License

[AGPL-3.0](LICENSE). Use it, self-host it, change it. If you run a modified version as a public service, publish your changes under the same license.
