# Teaser video tools

Recreates `media/galaxy-trade-lanes-teaser.mp4` (20 s, 1920x1080, H.264 + AAC) from the real game.

- `record.cjs` drives the desktop build and the online lobby in headless Chromium (Playwright) and saves screencast frames plus the timing of every sound effect.
- `audio.cjs` renders the game's own soundtrack (`music.js`) with those sound effects offline, so audio and picture line up exactly.
- ffmpeg turns the frames into clips, joins them, adds the audio, fades out and normalizes loudness.

The commands used are in the project history (the commit that added this folder). Needs Node.js, Playwright with Chromium, and ffmpeg.
