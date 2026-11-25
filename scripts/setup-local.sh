#!/usr/bin/env bash
# lafz local mode: captions on your own Mac, no API keys, offline after this runs once.
#   ./scripts/setup-local.sh        then        pnpm local
# Needs an Apple Silicon Mac (M1 or newer), Homebrew and Node 20+. Downloads about 5 GB once:
# Whisper large-v3-turbo (~1.6 GB) and a small open language model through Ollama (~3.3 GB).
set -euo pipefail

MODEL="${LAFZ_LOCAL_MODEL:-gemma3:4b}"
say() { printf "\n\033[1m%s\033[0m\n" "$1"; }

[[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" ]] || { echo "Local mode needs a Mac with Apple Silicon (M1 or newer)."; exit 1; }
command -v brew >/dev/null || { echo "Install Homebrew first: https://brew.sh"; exit 1; }
command -v node >/dev/null || { echo "Install Node 20 or newer first: brew install node"; exit 1; }

say "1/5  Tools: uv (runs Whisper on MLX) and Ollama (runs the spelling model)"
command -v uv >/dev/null || brew install uv
command -v ollama >/dev/null || brew install ollama
brew services start ollama >/dev/null 2>&1 || (ollama serve >/dev/null 2>&1 &)
for _ in {1..20}; do curl -s localhost:11434 >/dev/null && break; sleep 1; done

say "2/5  Spelling model: $MODEL (Ollama)"
ollama pull "$MODEL"

say "3/5  Whisper large-v3-turbo on MLX (first run downloads it)"
SILENCE="$(mktemp -d)/silence.wav"
# One second of 16 kHz mono silence, just to fetch and warm up the model.
python3 - "$SILENCE" <<'PY'
import sys, wave
w = wave.open(sys.argv[1], "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000); w.writeframes(b"\0\0" * 16000); w.close()
PY
uvx --from mlx-whisper mlx_whisper "$SILENCE" --model mlx-community/whisper-large-v3-turbo --output-dir "$(dirname "$SILENCE")" --verbose False >/dev/null

say "4/5  Settings"
touch .env.local
grep -q '^LAFZ_LOCAL=' .env.local || echo "LAFZ_LOCAL=1" >> .env.local
grep -q '^LAFZ_LOCAL_MODEL=' .env.local || echo "LAFZ_LOCAL_MODEL=$MODEL" >> .env.local

say "5/5  Build"
corepack enable >/dev/null 2>&1 || npm install -g pnpm
pnpm install --frozen-lockfile
pnpm build

say "Done. Start lafz with:  pnpm local   →   http://localhost:3300"
echo "Everything now runs on this Mac. Your videos never leave it."
