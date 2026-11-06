# Builds the desktop version as a Claude artifact page into desktop/index.html
# (no <html>/<head>/<body> tags: the artifact viewer adds them). Same game as index.html.
cd "$(dirname "$0")"; mkdir -p desktop
{ sed 's#<title>.*</title>#<title>Galaxy Trade Lanes Desktop</title>#' head.html; echo '<style>'; cat style.css; echo '</style>'
echo '<div id="app"><header class="top"><div class="brand">GALAXY TRADE LANES<small>CARGO &amp; CREDITS · A FREIGHT DECK-BUILDER</small></div><div class="status" id="status"></div><nav><div class="sound"><button id="mus" data-a="music" aria-pressed="false">Music off</button><input id="vol" type="range" min="0" max="1" step="0.05" value="0.5" aria-label="Music volume"></div><button data-a="rules">Rules</button><button data-a="enc">Cards</button><button data-a="records">Records</button><button data-a="new">New run</button></nav></header><main id="stage"></main></div>'
echo '<div id="overlay" class="overlay" hidden><section id="dialog" class="dialog notch" tabindex="-1" role="dialog" aria-modal="true" aria-label="Game dialog"></section></div>'
echo '<script>'; cat engine.js sprites.js music.js ui.js | sed 's/lanehaul-/gtl-desktop-/g'; echo '</script>'; } > desktop/index.html
