#!/bin/bash
# mint.sh — press a fresh minting of the wall for profile assets.
# The wall is the site engine itself; every run is a new composition.
# Usage: ./mint.sh [out-prefix]   (writes <prefix>-banner.png, roll until one feels right)
set -e
cd "$(dirname "$0")/.."
OUT="${1:-/tmp/mint}"
python3 - << 'PY'
src = open('index.html').read()
# ink boxes stay alive but offscreen: the engine paints, no clearings show.
# (an empty page mints black at some viewport sizes — engine quirk, unprobed)
src = src.replace('</style>', '#page { visibility:hidden; position:absolute; top:250vh; } </style>', 1)
open('/tmp/_mint_page.html','w').write(src)
PY
google-chrome-stable --headless --disable-gpu --hide-scrollbars \
  --virtual-time-budget=9000 --window-size=1500,500 \
  --screenshot="$OUT-banner.png" file:///tmp/_mint_page.html 2>/dev/null
echo "minted: $OUT-banner.png"
echo "pfp recipe: crop 400x400 around an entity, upscale nearest —"
echo "  ffmpeg -i $OUT-banner.png -vf 'crop=400:400:X:Y,scale=800:800:flags=neighbor' pfp.png"
