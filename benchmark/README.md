# Accuracy benchmark

Drop one set of files per reel here (see `scripts/benchmark.mts` for the details):

- `<reel>.mp4` (optional with `--run`)
- `<reel>.reference.txt`: the correct transcript, checked by a person
- `<reel>.kalakar.srt` (or `.txt`), and any other tool the same way
- `<reel>.lang`: e.g. `hindi latin` or `tamil native` (default `hindi latin`)

```bash
pnpm benchmark --run http://localhost:3300
```

Reels and their transcripts aren't committed (see `.gitignore`); `results.json` is.
