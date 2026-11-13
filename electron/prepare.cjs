// Copies the desktop browser build (../index.html) into game/ for the Electron app.
// The browser build is not changed. The copy only:
//  - loads the bundled fonts instead of Google Fonts, so the app works offline;
//  - adds a Content-Security-Policy that keeps the page to its own files.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'index.html');
const outDir = path.join(__dirname, 'game');
const fontDir = path.join(__dirname, 'fonts');

let html = fs.readFileSync(src, 'utf8');

const googleFonts = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/[^"]*">/;
if (!googleFonts.test(html)) throw new Error('Google Fonts link not found in index.html; update prepare.cjs');
html = html.replace(googleFonts, '<link rel="stylesheet" href="fonts/fonts.css">');

const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:";
html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="' + csp + '">');

if (/https?:\/\//.test(html.replace(/<script>[\s\S]*<\/script>/, ''))) {
  console.warn('warning: game/index.html still references a web address outside the script');
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'fonts'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
for (const f of fs.readdirSync(fontDir)) fs.copyFileSync(path.join(fontDir, f), path.join(outDir, 'fonts', f));
console.log('game/index.html ready (' + Math.round(html.length / 1024) + ' KB, from index.html)');
