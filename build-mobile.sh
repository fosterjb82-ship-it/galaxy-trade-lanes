# Builds the phone version into mobile/index.html (published as a Claude artifact).
# It shares engine.js, sprites.js, music.js, ui.js and style.css with the browser build,
# then layers mobile/mobile.css and mobile/mobile.js on top.
# Saves use their own "gtl-mobile-" storage keys so they never mix with the browser version.
cd "$(dirname "$0")"
{ cat mobile/head.html; echo '<style>'; cat style.css mobile/mobile.css; echo '</style>'
echo '<div id="app"><header class="top"><div class="brand">GALAXY TRADE LANES<small>CARGO &amp; CREDITS · POCKET</small></div><nav><button id="mus" data-a="music" aria-pressed="false">Music off</button><input id="vol" type="range" min="0" max="1" step="0.05" value="0.5" aria-label="Music volume" hidden><button data-a="menu">Menu</button></nav><div class="status" id="status"></div></header><main id="stage"></main></div>'
echo '<div id="overlay" class="overlay" hidden><section id="dialog" class="dialog notch" tabindex="-1" role="dialog" aria-modal="true" aria-label="Game dialog"></section></div>'
echo '<script>'; cat engine.js sprites.js music.js ui.js mobile/mobile.js | sed 's/lanehaul-/gtl-mobile-/g'; echo '</script>'; } > mobile/index.html
