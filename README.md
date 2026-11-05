# Galaxy Trade Lanes: Cargo & Credits

A pixel-art space freight deck-builder for 2–6 captains (any mix of humans and computer players). Buy cards, load your hold, and race rival captains to the same public contracts. Profit is the score.

Planned series: **Galaxy Trade Lanes: Cargo & Credits** (this game) and **Galaxy Trade Lanes: Fleet Battles** (a future combat-focused game).

## Play it

Open `index.html` in any desktop browser. Everything (code, pixel art, music) is generated inside that one file, so it works offline with no install. Fonts load from Google Fonts when online and fall back to system fonts otherwise.

## Phone version (Pocket)

A separate phone build lives in `mobile/` and is published as a Claude artifact, so it plays inside the Claude app:
https://claude.ai/artifact/QeNrSTmdALXVTgVnza3yir

It uses the same rules, art and music as the browser version, with its own layout: a compact header, an always-visible strip with this turn's pool, and tabs along the bottom for Hand, Contracts, Market and Captains. Its saves and records use separate `gtl-mobile-` storage keys, so they never mix with the browser version.

## Files

| File | What it does |
|---|---|
| `engine.js` | Game rules: decks, cards, contracts, buying, scoring, computer players. No graphics. |
| `sprites.js` | Draws all pixel art in code (cards, destinations, hero ship, icons). |
| `music.js` | The background soundtrack, synthesized live with the Web Audio API. |
| `ui.js` | Screens, buttons, dialogs, setup, saving, records. |
| `style.css` | Layout and look. |
| `head.html` | Page title and font links. |
| `build.sh` | Combines everything above into `index.html`. |
| `index.html` | The built, playable game. Do not edit by hand; edit the sources and rebuild. |
| `mobile/mobile.css`, `mobile/mobile.js`, `mobile/head.html` | Phone layout, laid over the shared files above. |
| `build-mobile.sh` | Combines the shared files plus `mobile/` into `mobile/index.html` (the phone build). |
| `tests/` | Automated checks of the rules engine (needs Node.js). |
| `preview.cjs` | Renders the pixel art to PNG sheets in `out/` for reviewing art (needs Node.js). |

## Rebuild and test

```bash
bash build.sh                       # rebuild index.html
bash build-mobile.sh                # rebuild mobile/index.html (phone build)
node tests/sim.test.cjs             # 120 simulated 3-player games
node tests/six-players.test.cjs     # 2–6 player games and played-card tracking
node tests/boss.test.cjs            # pirate boss rules
node preview.cjs                    # art preview sheets into out/
```

## Rules summary

- Turn counters are called **Deals** (purchases left) and **Orders** (order cards you can still play; 2 per turn by default).
- The card market is sorted by cost, then resource cards before order cards.
- Everyone starts with 10 cards (4 Scrip, 3 Fuel Drums, 2 Ore Samples, 1 Hold Rig) and draws 5 each turn.
- Resource cards are unlimited per turn. Order cards use an order (2 per turn by default, or unlimited).
- Contracts on the shared board need fuel, ore, tech, credits and/or combat, plus cargo space equal to ore + tech. Base cargo space is 1 per turn.
- One deal (purchase) per turn (Brokerage adds one). Bought cards go to the discard pile.
- Pirate patrol: spend 3 combat + 1 fuel for +5 profit, once per turn.
- Cash in: trade 4 credits for 1 profit, any time on your turn, as often as you can afford.
- Salvage Crew (costs 5): an action card that scraps 1 other card from your hand for free (not limited by the once-per-turn scrap), then draws 2.
- Trade Charter (costs 8): a resource card worth 2 credits and 2 profit each time it is played.
- Pirate threats (setup option, on by default): two bosses per run, the first in round 5 and the second about 70% of the way through, each drawn at random (no repeats) from six bosses with their own ability: Blackwake Dreadnought (no tricks), Red Maw Marauder (raid takes 8), Iron Corsair Armada (mercenaries cost 3), Void Wraith (only 2 rounds, thin hull), Scrap Hive Swarm (repairs 1 hull per captain each round), Siren of Lumen Gate (+2 profit per damage, tougher hull). While a boss is active no contracts can be delivered. Spend combat (1 damage each) or hire mercenaries (usually 2 credits per damage). Beaten: +1 profit per damage dealt (Siren: +2) and +5 for the final blow. Not beaten in time: it raids every captain and leaves. In testing, computer captains beat each boss 61–83% of the time. Each human captain confirms a results screen afterwards.
- Weapons Officer (costs 5): an action card that gives 2 combat and draws 1; combat spent on a boss that turn deals double damage.
- Sound effects (your turn, playing and buying cards, deliveries, patrols, cashing in, scrapping, tabs and menus) are synthesized in `music.js` and play only while music is on.
- Runs saved before a new card was added get that card fully stocked in the market when loaded (`Engine.migrate`).
- Scrap one card from hand for 1 credit, once per turn.
- Unspent resources vanish at end of turn. Highest profit after the set rounds wins, or race to a profit target with equal turns for everyone.

## Notes for continuing in Claude Code

- Keep `engine.js` free of any browser code so the rules can be tested and later reused in a desktop or Steam build (for example Electron, Tauri, or a port to an engine such as Godot).
- After any rules change, run both test files and rebuild both versions (`build.sh` and `build-mobile.sh`).
- `mobile/index.html` is written for the Claude artifact viewer (no `<html>`/`<head>` tags of its own). Republish it to the same artifact link after rebuilding.
- Saves and records use browser storage keys starting with `lanehaul-` (the game's earlier working name). Changing them would reset existing saves.
