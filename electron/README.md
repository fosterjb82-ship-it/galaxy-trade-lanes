# Desktop app (Electron)

A desktop window around the existing desktop browser build. It is the starting point for a Steam release.

The game is not copied or forked. `prepare.cjs` takes the built `../index.html` and makes two changes to the copy in `game/`:
- it loads the fonts bundled in `fonts/` instead of Google Fonts, so the app works offline;
- it adds a Content-Security-Policy that limits the page to its own files.

`index.html`, GitHub Pages and the other builds are not affected.

## Commands

Run these from this folder. You need Node.js 20 or newer.

```bash
npm install
```

Runs the app from source:
```bash
npm start
```

Builds the Windows app:
```bash
npm run build:win
```

This writes `dist/Galaxy Trade Lanes-win32-x64/` and `dist/GalaxyTradeLanes-<version>-win32-x64.zip`. It works from Windows, macOS or Linux, with no Wine needed. `build:mac` and `build:linux` build the other platforms. The macOS build has no app icon yet, because it would need an `icon.icns`.

Rebuild `../index.html` first (`bash ../build.sh`) after changing the game. `prepare.cjs` copies whatever is there.

## What the app does

- **Window size:** opens at 90% of the screen. The minimum size is 1536×780, the smallest size at which the 2560×1300 layout still fits (it scales down to 60%). On a smaller screen it opens maximized.
- **Fullscreen:** F11 or Alt+Enter.
- **Menus and devtools:** there is no menu bar. Devtools (Ctrl+Shift+I) work only when you run `npm start`.
- **Sound:** the soundtrack starts without needing a click.
- **Instances:** only one copy runs at a time.
- **Saves:** saves, records and sound settings are kept in the app's own storage. On Windows that is `%APPDATA%\Galaxy Trade Lanes`. They are separate from the browser version's.
- **Links:** web links open in the system browser. The window never navigates away from the game.
- **Icon:** `icon.png` and `icon.ico` are the game's cargo hauler ship.

## Not done yet

- **Code signing:** the .exe is unsigned, so Windows SmartScreen warns on first launch. Click "More info", then "Run anyway".
- **Steamworks:** no achievements, overlay or cloud saves yet (steamworks.js), and no SteamPipe upload configuration.
- **Small screens:** windows smaller than 1536×780, including the Steam Deck at 1280×800, need the scaling limit lowered or a layout of their own.
- **Online multiplayer:** the app runs the local game only. Online play still uses the separate Node server.

## Fonts

Rajdhani (Indian Type Foundry) and IBM Plex Sans and IBM Plex Mono (IBM) are under the SIL Open Font License 1.1, which allows bundling them. The license texts are in `fonts/`, and they are packaged with the game.
