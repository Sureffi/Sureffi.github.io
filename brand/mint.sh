#!/bin/bash
# mint.sh — press a fresh minting of the wall for profile assets.
# The wall is the site engine itself; every run is a new composition.
# Usage: ./mint.sh [out-prefix] [ms]   (ms: how far into the story to press, default 9000)
#   <prefix>-wall.png    the wall at its own resolution, 480x270
#   <prefix>-banner.png  2880x960, a 3:1 band of it, nearest-upscaled x6
# Roll until one feels right. This mints the wall at rest: rain, weather, the
# name standing in it, the three of them faint behind. For a profile picture
# crop a square of the wall and upscale it the same way —
#   magick <prefix>-wall.png -crop 120x120+330+64 +repage -scale 800% pfp.png
# — though an entity is brightest mid-story, which this doesn't reach.
set -e
cd "$(dirname "$0")/.."
OUT="${1:-/tmp/mint}"
MS="${2:-9000}"
python3 - << 'PY'
src = open('index.html').read()
# the page stays in the layout and keeps its height — the canvas is as tall as
# the body, so moving it out of flow leaves nothing to draw into. invisible is enough.
src = src.replace('</style>', '#page { visibility:hidden; } </style>', 1)
# the breach is skipped: under chrome's virtual clock it never resolves, and the
# resting wall is what mints anyway — rain, weather, the three of them in it.
src = src.replace('<script>', "<script>try{sessionStorage.setItem('booted','1')}catch(e){}</script>\n  <script>", 1)
# and the masthead's name is emptied, so nothing is written into the wall: a
# banner carries no text.
src = src.replace('data-decode data-clear>~Sureffi</h1>', 'data-decode data-clear></h1>', 1)
open('/tmp/_mint_page.html','w').write(src)
PY
# the window is the wall's own size, so one screen pixel is one wall pixel.
# it needs a real GL: --disable-gpu drops the page to its no-WebGL fallback, which mints black.
google-chrome-stable --headless --hide-scrollbars \
  --use-angle=vulkan --enable-features=Vulkan \
  --virtual-time-budget="$MS" --window-size=480,270 \
  --screenshot="$OUT-wall.png" file:///tmp/_mint_page.html 2>/dev/null
magick "$OUT-wall.png" -crop 480x160+0+60 +repage -scale 600% "$OUT-banner.png"
echo "minted: $OUT-wall.png  $OUT-banner.png"
