# Teaser video tools

Recreates `media/galaxy-trade-lanes-teaser.mp4` (20 s, 1920x1080, H.264 + AAC) from the real game.

- `record.cjs` drives the desktop build and the online lobby in headless Chromium (Playwright) and saves screencast frames plus the timing of every sound effect.
- `audio.cjs` renders the game's own soundtrack (`music.js`) with those sound effects offline, so audio and picture line up exactly.
- ffmpeg turns the frames into clips, joins them, adds the audio, fades out and normalizes loudness.

The commands used are in the project history (the commit that added this folder). Needs Node.js, Playwright with Chromium, and ffmpeg.

## 30-second trailer

`media/galaxy-trade-lanes-trailer-30s.mp4` (30 s, 1920x1080, H.264 + AAC) is made the same way in one continuous take:

```bash
node tools/teaser/record30.cjs <out-dir> index.html          # frames + cues30.json
node tools/teaser/audio.cjs music.js <out-dir>/cues30.json <out-dir>/t30.wav 30
```

then ffmpeg joins `<out-dir>/frames30/list.txt` with the audio (fade in/out, loudness normalised). The audio renderer plays the cue `victory` as the victory fanfare.
