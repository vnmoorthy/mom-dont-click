#!/usr/bin/env bash
# Rebuild the deck end to end:
#   wall-demo.webm -> wall-demo.mp4 + wall-demo.gif   (only if missing, or with --media)
#   build-deck.js  -> deck-raw.pptx + anim-plan.json
#   animate.py     -> ../mom-dont-click.pptx          (theme, transitions, animations, video autoplay)
#   soffice        -> ../mom-dont-click.pdf + renders/slide-NN.jpg   (skipped with --no-render)
#
# Needs: node (npm install in this folder), python3 with defusedxml, ffmpeg.
# Optional: LibreOffice + pdftoppm for the PDF and the slide renders.
set -euo pipefail
cd "$(dirname "$0")"

MEDIA="../../media"
SOFFICE_WRAPPER="${SOFFICE_WRAPPER:-}"   # optional: path to a soffice.py wrapper
VALIDATE="${VALIDATE:-}"                 # optional: path to an OOXML validate.py

if [[ "${1:-}" == "--media" || ! -f "$MEDIA/wall-demo.mp4" ]]; then
  # 33 seconds: two and a half of the idle wall, the live browser, then the SCAM slam.
  ffmpeg -v error -y -ss 3 -t 33 -i "$MEDIA/wall-demo.webm" -an \
    -vf "scale=1280:720:flags=lanczos,fps=24,format=yuv420p" \
    -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 18 -pix_fmt yuv420p -movflags +faststart \
    "$MEDIA/wall-demo.mp4"
fi
if [[ "${1:-}" == "--media" || ! -f "$MEDIA/wall-demo.gif" ]]; then
  # README GIF: the same stretch at 1.125x so it lands on the verdict in 28 seconds.
  PAL="$(mktemp -t mdc-palette).png"
  ffmpeg -v error -y -ss 3.5 -t 31.5 -i "$MEDIA/wall-demo.webm" \
    -vf "setpts=PTS/1.125,fps=10,scale=900:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" "$PAL"
  ffmpeg -v error -y -ss 3.5 -t 31.5 -i "$MEDIA/wall-demo.webm" -i "$PAL" \
    -lavfi "setpts=PTS/1.125,fps=10,scale=900:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
    -loop 0 "$MEDIA/wall-demo.gif"
  rm -f "$PAL"
fi

[[ -d node_modules ]] || npm install --no-audit --no-fund
node build-deck.js
python3 animate.py

if [[ -n "$VALIDATE" ]]; then
  python3 "$VALIDATE" ../mom-dont-click.pptx
fi

if [[ "${1:-}" != "--no-render" ]]; then
  mkdir -p renders
  if [[ -n "$SOFFICE_WRAPPER" ]]; then
    python3 "$SOFFICE_WRAPPER" --headless --convert-to pdf --outdir .. ../mom-dont-click.pptx
  elif command -v soffice >/dev/null; then
    soffice --headless --convert-to pdf --outdir .. ../mom-dont-click.pptx
  else
    echo "LibreOffice not found: skipping the PDF and the renders"; exit 0
  fi
  if command -v pdftoppm >/dev/null; then
    rm -f renders/slide-*.jpg
    pdftoppm -jpeg -r 110 ../mom-dont-click.pdf renders/slide
    ls -1 "$PWD"/renders/slide-*.jpg
  fi
fi
