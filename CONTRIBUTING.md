# Contributing to lafz

lafz is open source so captions for Indian languages get better for everyone. Three easy ways in:

## 1. Add a caption style

Styles are plain JSON files in [`src/presets/`](src/presets/), credited to whoever made them.

1. Copy one, e.g. `src/presets/headline.json`, to `src/presets/<your-style>.json`.
2. Change `id`, `name`, `blurb` and `credit` (your name, and a link if you like).
3. Change any `style` fields. Everything you leave out uses the defaults in `BASE` in
   [`src/lib/templates.ts`](src/lib/templates.ts), where each field is explained.
4. Add your file to the list in `src/presets/index.ts`.
5. Run `pnpm dev`, check it in the editor's Style tab on a real reel, and open a pull request
   with a screenshot.

Fonts must be free to redistribute (Google Fonts is easiest: add it in `src/app/fonts.ts` and
`src/lib/fonts.ts`). Paid fonts can't be included; people can upload their own copies in the editor.

## 2. Improve a language

Each language is in [`src/lib/languages.ts`](src/lib/languages.ts); the spelling rules are in
[`src/server/spelling.ts`](src/server/spelling.ts). The best help is evidence: a reel where
captions come out wrong, with the correct words. Open an issue with the "Language" template.

## 3. Measure accuracy

[`scripts/benchmark.mts`](scripts/benchmark.mts) scores any captioning tool against a
transcript a person checked. Run it on your own reels and share the numbers.

## Running it

```bash
pnpm install
cp .env.example .env.local   # your own OPENAI_API_KEY and SARVAM_API_KEY
pnpm dev
```

Before a pull request: `pnpm typecheck` and `pnpm lint` should pass. Keep changes focused,
write plain comments that say why, and never commit `.env*` files or media.

Security issues: please don't open an issue, see [SECURITY.md](SECURITY.md).

By contributing you agree your work is released under the [AGPL-3.0](LICENSE).
