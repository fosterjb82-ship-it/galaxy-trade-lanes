// Galaxy Trade Lanes desktop app: a window around the desktop browser build.
// The game itself is game/index.html, copied from ../index.html by prepare.cjs.
const { app, BrowserWindow, Menu, shell, screen } = require('electron');
const path = require('path');

// The soundtrack starts with the title screen, before any click.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// One copy at a time: a second launch focuses the first window.
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function createWindow() {
  // The layout is drawn at 2560x1300 and scaled to the window (down to 60%),
  // so it needs at least 1536x780 of content to show everything.
  const MIN_W = 1536, MIN_H = 780;
  const area = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(area.width, Math.max(MIN_W, Math.round(area.width * 0.9)));
  const height = Math.min(area.height, Math.max(MIN_H, Math.round(area.height * 0.9)));
  const small = area.width < MIN_W || area.height < MIN_H;

  win = new BrowserWindow({
    width, height,
    minWidth: Math.min(MIN_W, area.width), minHeight: Math.min(MIN_H, area.height),
    useContentSize: true,
    backgroundColor: '#070b14',
    title: 'Galaxy Trade Lanes',
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });

  win.once('ready-to-show', () => { if (small) win.maximize(); win.show(); });
  win.loadFile(path.join(__dirname, 'game', 'index.html'));

  // F11 or Alt+Enter: fullscreen. Esc leaves fullscreen only if the game has no dialog open,
  // so it is left to the page. Ctrl+Shift+I opens devtools in unpackaged runs only.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      win.setFullScreen(!win.isFullScreen()); e.preventDefault();
    } else if (!app.isPackaged && input.control && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools(); e.preventDefault();
    }
  });

  // The game is one local page: never navigate the window away from it,
  // and send any web link to the system browser instead.
  const external = url => { if (/^https:\/\//.test(url)) shell.openExternal(url); };
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (url !== win.webContents.getURL()) { e.preventDefault(); external(url); }
  });
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});

app.on('window-all-closed', () => app.quit());
