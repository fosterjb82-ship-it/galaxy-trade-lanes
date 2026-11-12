# Galaxy Trade Lanes: Cargo & Credits

A pixel-art space freight deck-builder for 2–6 captains (any mix of humans and computer players). Buy cards, load your hold, and race rival captains to the same public contracts. **Favor** (with the trade authorities) is the score.

Planned series: **Galaxy Trade Lanes: Cargo & Credits** (this game) and **Galaxy Trade Lanes: Fleet Battles** (a future combat-focused game).

## Play it

Open `index.html` in any desktop browser. Everything (code, pixel art, music) is generated inside that one file, so it works offline with no install. Fonts load from Google Fonts when online and fall back to system fonts otherwise.

## Phone version (Pocket)

A separate phone build lives in `mobile/` and is published as a Claude artifact, so it plays inside the Claude app:
https://claude.ai/artifact/QeNrSTmdALXVTgVnza3yir

It uses the same rules, art and music as the browser version, with its own layout: a compact header, an always-visible strip with this turn's pool, and tabs along the bottom for Hand, Contracts, Market and Captains. Its saves and records use separate `gtl-mobile-` storage keys, so they never mix with the browser version.

## Play online (desktop browsers, 2–6 human captains)

You run a small game server on your own computer, and Cloudflare gives it a temporary public link for your friends. The link stops working when you close the server. No Cloudflare account is needed.

**One-time setup**
1. Install **Node.js** (the LTS version) from nodejs.org.
2. Install **cloudflared**, Cloudflare's tunnel program:
   - Mac (with Homebrew): `brew install cloudflared`
   - Windows: `winget install --id Cloudflare.cloudflared`
   - Or download it from Cloudflare's "Downloads" page for cloudflared.

**Each game night**
1. Double-click `start-online.command` (Mac) or `start-online.bat` (Windows), or run `node server/server.js`.
2. The window prints two links:
   - **Your link** (`http://localhost:8787/?host=…`): open it yourself; you become the host.
   - **Link for your friends** (`https://….trycloudflare.com`): send it to them.
3. Everyone types a name and lands in the lobby. The host picks the rules and clicks **Launch run**.
4. Keep the window open while you play. Ctrl+C (or closing the window) ends the table.

**Good to know**
- The server runs the rules; each browser sees only its own hand. Moves out of turn are refused.
- Closed a tab? Open the same link again in the same browser to get your seat back. The table is also saved to `server/saved-game.json`, so restarting the server resumes it (with a new friends' link).
- The host can **Skip turn** for a captain who has left, **Remove** captains or **Make host** someone else in the lobby, and **End run** to return everyone to the lobby.
- Anyone with the friends' link can join until the run starts, so share it only with your group.
- Rebuild the online page after changing the game: `bash build-online.sh` (the server serves `online/index.html`).
- Options: `PORT=9000 node server/server.js` picks another port; `NO_TUNNEL=1` skips starting cloudflared.

## Watching other captains

Every move is recorded by the engine as an event (who, what, how much). The desktop screen uses them to show:
- **Captain's log** in the left rail: a running log of every move by every captain (cards played, deliveries, purchases, patrols, cash-ins, scraps, boss hits), newest first, with a divider per turn. Six entries show at once; scroll for the last 80 moves.
- **Bigger pool** once your hand is played out (or nothing left in it can be played): the hand band collapses to large resource counters, with any unplayable cards as chips you can still scrap.
- **Their table** in the hand band while someone else plays: the cards they have played face up, the rest of their hand face down, their live pool.
- **Board effects**: deliveries fly to the captain who made them, favor changes pop beside each captain, bought market cards flash, boss hits shake the boss and show the damage, the active captain's standings row says *playing*.
- **Computer turns play back one move at a time** (setup option *Computer turns*: normal, slow, fast or instant; Speed and *Skip to my turn* buttons while they play). Online, several moves sent at once (like Play resources) are shown one after another.

## Card details

- Every card that produces resources shows them as icons on its art (hand, market, tables, popups).
- **Magnified view**: right-click any card or contract (stays open until you click elsewhere or press Esc), rest the mouse on it for 1 second (closes when you move away), or press and hold on a phone. Cards show large art, cost, market stock, whether they use an order, how many you own, and what their resources are for; contracts show each requirement against your pool (✓/✗), the cargo space needed, and whether they are ready, missing something or blockaded. The hover delay is `DWELL_MS` in `ui.js`.

## Captain ships

Each captain flies one of eight ships (Longhaul Freighter, Starling Courier, Red Talon Corvette, Wayfarer Explorer, Rockjaw Miner, Solar Clipper, Ironclad Tug, Aurora Cruiser), unique per run. Human captains pick on the setup screen (or in the online lobby, where the server keeps picks unique); computer captains get the free ones. The ship's pixel-art badge shows next to the active captain, in the standings, the captain's log, the "you are up" and "now playing" panels, and on the victory screen. Ships are listed in `engine.js` (`SHIPS`), ready for faction strengths and weaknesses in a later update; art is in `sprites.js` (`SHIP_ART`).

## Victory screen

When a run ends, a victory screen shows the winner's name and favor, tabs for every captain in finishing order, and for the selected captain: a **score breakdown** (one stacked bar by favor source: contracts, pirate patrols, boss rewards, cash-ins, Trade Charters, buyouts; losses to raids and buyouts in a separate red row; a legend with every amount) and **every contract they delivered** as large cards with the round. The engine tracks each captain's favor sources (`player.score`), which always add up to their final favor (stored internally as `profit`). Captains' decks and Review board stay available. Colours come from a palette checked for colour-blind separation on the dark panel.

## Tutorial

**Tutorial** on the start screen launches a short guided game (18 steps, about 3 minutes) against one computer captain, in the desktop and phone builds. A coach box explains each step and a spotlight shows where to look; action steps continue once the player has done them. Hands are set up so every lesson works: playing resources, the pool, cargo space, delivering, buying, ending a turn, orders, pirate patrol, cashing in, and a small boss fight with Weapons Officer double damage. At the end the player keeps playing that run (pirate threats switch on) or starts a real run. Code: `tutorial.js`.

## Desktop layout

The desktop screen (browser, online and desktop-artifact builds) is laid out for a 2560×1300 browser window (a 2K monitor) and scaled to fit any window: about 73% on 1080p, 100% on 2K or 4K at 150% scaling, 150% on 4K at 100%. A captain rail sits on the left; on the right are three bands: the contract board on top (largest cards), the card market in the middle (compact mini cards with a hover popup while you hold a hand; full cards in two rows once your hand is played out or it is someone else's turn), and your hand at the bottom (large cards, with your pool and turn buttons).

## Files

| File | What it does |
|---|---|
| `engine.js` | Game rules: decks, cards, contracts, buying, scoring, computer players. No graphics. |
| `sprites.js` | Draws all pixel art in code (cards, destinations, hero ship, icons). |
| `music.js` | The background soundtrack, synthesized live with the Web Audio API. |
| `ui.js` | Screens, buttons, dialogs, setup, saving, records. |
| `style.css` | Layout and look. |
| `head.html` | Page title and font links. |
| `tutorial.js` | The guided tutorial (coach box, spotlight, scripted hands). |
| `build.sh` | Combines everything above into `index.html`. |
| `index.html` | The built, playable game. Do not edit by hand; edit the sources and rebuild. |
| `mobile/mobile.css`, `mobile/mobile.js`, `mobile/head.html` | Phone layout, laid over the shared files above. |
| `server/server.js` | Online game server: runs the rules for one table, serves `online/index.html`, starts the Cloudflare tunnel. |
| `online/online.js`, `online/online.css` | Online lobby and network play, laid over the desktop layout. |
| `build-online.sh` | Builds `online/index.html` (the online page). |
| `start-online.command`, `start-online.bat` | Double-click launchers for the online server (Mac, Windows). |
| `build-mobile.sh` | Combines the shared files plus `mobile/` into `mobile/index.html` (the phone build). |
| `tests/` | Automated checks of the rules engine (needs Node.js). |
| `preview.cjs` | Renders the pixel art to PNG sheets in `out/` for reviewing art (needs Node.js). |

## Rebuild and test

```bash
bash build.sh                       # rebuild index.html
bash build-mobile.sh                # rebuild mobile/index.html (phone build)
bash build-online.sh                # rebuild online/index.html (online multiplayer page)
bash build-desktop-artifact.sh      # rebuild desktop/index.html (desktop version as a Claude artifact)
node tests/sim.test.cjs             # 120 simulated 3-player games
node tests/six-players.test.cjs     # 2–6 player games and played-card tracking
node tests/boss.test.cjs            # pirate boss rules
node preview.cjs                    # art preview sheets into out/
```

## Rules summary

- Turn counters are called **Deals** (purchases left) and **Orders** (order cards you can still play; 2 per turn by default).
- Card market (setup option **Card market**, also in the online lobby): **Standard** (default) offers the 8 core cards (Dockside Deal, Plasma Pack, Barge, Quartermaster, Data Vault, Ore Borer, Gunship, Clearing House) every game plus 4 random specialists from the other 8, always including at least one costing 5+ and one extra combat card. **Full** offers all 16. Specialists carry a violet *Specialist* tag; the Encyclopedia lists every card marked Core / Specialist / In this game. Saves from before this option load with the full market. In testing, computer captains beat 65–70% of bosses with a Standard market versus 67–76% with Full.
- The card market shows core cards first, then specialists, each sorted by cost, then resource cards before order cards.
- Everyone starts with 10 cards (4 Scrip, 3 Fuel Drums, 2 Ore Samples, 1 Hold Rig) and draws 5 each turn.
- Resource cards are unlimited per turn. Order cards use an order (2 per turn by default, or unlimited).
- Contracts on the shared board need fuel, ore, tech, credits and/or combat, plus cargo space equal to ore + tech. Base cargo space is 1 per turn.
- One deal (purchase) per turn (Brokerage adds one). Bought cards go to the discard pile.
- Pirate patrol: spend 3 combat + 1 fuel for +5 favor, once per turn.
- Cash in: trade 4 credits for 1 favor, any time on your turn, as often as you can afford.
- Salvage Crew (costs 5): an action card that scraps 1 other card from your hand for free (not limited by the once-per-turn scrap), then draws 2.
- Trade Charter (costs 8): a resource card worth 2 credits and 2 favor each time it is played.
- Pirate threats (setup option, on by default): a boss arrives every 5 rounds (counted from the last boss's arrival, starting in round 5). Each pirate patrol pushes the next boss back 1 round, at most 2 rounds per boss (so a 16-round run always gets at least 2 bosses). Each boss is drawn at random (no repeats) from six with their own ability: Blackwake Dreadnought (no tricks), Red Maw Marauder (raid takes 8), Iron Corsair Armada (mercenaries cost 3), Void Wraith (only 2 rounds, thin hull), Scrap Hive Swarm (repairs 1 hull per captain each round), Siren of Lumen Gate (+2 favor per damage, tougher hull). While a boss is active no contracts can be delivered; the boss panel shows rounds and captain turns left. Spend combat (1 damage each) or hire mercenaries (usually 2 credits per damage). Beaten: +1 favor per damage dealt (Siren: +2) and +5 for the final blow. Not beaten in time: it raids every captain, and the captain(s) who dealt the least damage lose double. Later bosses have more hull; computer captains beat roughly 66–79% of bosses in testing. Each human captain confirms a results screen afterwards.
- Weapons Officer (costs 5): an action card that gives 2 combat and draws 1; combat spent on a boss that turn deals double damage.
- Sound: the **Sound** button opens a panel with three separate switches and volumes: **All sound** (master), **Music** (soundtrack and victory fanfare) and **Effects** (cards, deliveries, patrols, bosses, menus), plus Test effects. Settings are remembered in the browser. All audio is synthesized in `music.js`.
- Runs saved before a new card was added get that card fully stocked in the market when loaded (`Engine.migrate`).
- Scrap one card from hand for 1 credit, once per turn.
- Unspent resources vanish at end of turn. Highest favor after the set rounds wins, or race to a favor target with equal turns for everyone.

## Notes for continuing in Claude Code

- Keep `engine.js` free of any browser code so the rules can be tested and later reused in a desktop or Steam build (for example Electron, Tauri, or a port to an engine such as Godot).
- After any rules change, run both test files and rebuild both versions (`build.sh` and `build-mobile.sh`).
- `mobile/index.html` is written for the Claude artifact viewer (no `<html>`/`<head>` tags of its own). Republish it to the same artifact link after rebuilding.
- Saves and records use browser storage keys starting with `lanehaul-` (the game's earlier working name). Changing them would reset existing saves.
