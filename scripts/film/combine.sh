#!/usr/bin/env bash
# Merge your own recording with the product film.
#
#   scripts/film/combine.sh <your-recording> [--offset SECONDS] [--audio-only] [--out FILE]
#
# <your-recording>  a video of you (camera + mic) or just audio (m4a, mp3, wav, mov, mp4)
# --offset          where the film starts inside your recording. Default: found automatically
#                   from the teleprompter's beep; if none is found, 0.
# --audio-only      use only your voice, no picture-in-picture of your face
#
# Output: docs/video/demo-final.mp4 (1920x1080, your voice, loudness-normalised).
set -euo pipefail
cd "$(dirname "$0")/../.."

IN="${1:?usage: scripts/film/combine.sh <your-recording> [--offset S] [--audio-only] [--out FILE]}"; shift
OFFSET=""; AUDIO_ONLY=0; OUT="docs/video/demo-final.mp4"
while [ $# -gt 0 ]; do
  case "$1" in
    --offset) OFFSET="$2"; shift 2 ;;
    --audio-only) AUDIO_ONLY=1; shift ;;
    --out) OUT="$2"; shift 2 ;;
    *) echo "unknown option $1"; exit 1 ;;
  esac
done
FILM="docs/video/demo.mp4"
[ -f "$FILM" ] || { echo "Missing $FILM. Run: node scripts/film/record.mjs"; exit 1; }
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FILM")"

if [ -z "$OFFSET" ]; then
  # the teleprompter plays a 0.25 s, 1 kHz beep the instant the film starts: find where it ends
  END="$(ffmpeg -hide_banner -nostats -i "$IN" -t 60 -af "highpass=f=900,lowpass=f=1100,silencedetect=n=-32dB:d=0.12" -f null - 2>&1 \
        | awk '/silence_end/ {print $5; exit}')"
  if [ -n "$END" ]; then OFFSET="$(python3 -c "print(max(0.0, $END - 0.25))")"; echo "Found the beep: the film starts ${OFFSET}s into your recording"
  else OFFSET=0; echo "No beep found; assuming your recording starts with the film (use --offset to adjust)"; fi
fi
# skip the beep itself
VOICE_START="$(python3 -c "print($OFFSET + 0.3)")"

HAS_VIDEO="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of csv=p=0 "$IN" || true)"
if [ "$AUDIO_ONLY" = 1 ] || [ -z "$HAS_VIDEO" ]; then
  ffmpeg -v error -y -i "$FILM" -ss "$VOICE_START" -i "$IN" \
    -filter_complex "[1:a]adelay=300|300,highpass=f=80,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11,apad[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t "$DUR" -movflags +faststart "$OUT"
else
  # a round picture-in-picture of you, bottom right (the film keeps that corner clear)
  ffmpeg -v error -y -i "$FILM" -ss "$OFFSET" -i "$IN" \
    -filter_complex "\
[1:v]crop='min(iw,ih)':'min(iw,ih)',scale=260:260,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-130,Y-130),128),255,0)'[cam];\
[0:v][cam]overlay=W-w-56:H-h-44:shortest=0:eof_action=pass[v];\
[1:a]atrim=start=0.3,asetpts=PTS-STARTPTS,adelay=300|300,highpass=f=80,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11,apad[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -t "$DUR" -movflags +faststart "$OUT"
fi
echo "Wrote $OUT"
