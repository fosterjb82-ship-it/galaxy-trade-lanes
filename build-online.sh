# Builds the online multiplayer page into online/index.html (served by server/server.js).
# Shares the rules, art, music and desktop layout with the browser build, then adds online/online.js.
# Browser storage uses its own "gtl-online-" keys so it never mixes with the other versions.
cd "$(dirname "$0")"
{ echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'; sed 's#<title>.*</title>#<title>Galaxy Trade Lanes Online</title>#' head.html; echo '<style>'; cat style.css online/online.css; echo '</style></head><body>'
echo '<div id="app"><header class="top"><div class="brand">GALAXY TRADE LANES<small>CARGO &amp; CREDITS · ONLINE TABLE</small></div><div class="status" id="status"></div><nav><div class="sound"><button id="mus" data-a="music" aria-pressed="false">Music off</button><input id="vol" type="range" min="0" max="1" step="0.05" value="0.5" aria-label="Music volume"></div><button data-a="rules">Rules</button><button data-a="enc">Cards</button><button data-a="records">Records</button><button data-a="new">End run</button></nav></header><main id="stage"></main></div>'
echo '<div id="overlay" class="overlay" hidden><section id="dialog" class="dialog notch" tabindex="-1" role="dialog" aria-modal="true" aria-label="Game dialog"></section></div>'
echo '<script>'; cat engine.js sprites.js music.js ui.js online/online.js | sed 's/lanehaul-/gtl-online-/g'; echo '</script></body></html>'; } > online/index.html
