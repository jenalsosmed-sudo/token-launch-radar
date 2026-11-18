# Token Radar

[![make.fun](https://make.fun/badge/token-radar-01.svg)](https://make.fun)
[![rank](https://make.fun/badge/token-radar-01/jenalsosmed-sudo/token-launch-radar/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/token-radar-01/jenalsosmed-sudo/token-launch-radar/reward.svg)](https://make.fun)

A token launch radar for the [make.fun bounty **Build the best token launch radar**](https://make.fun/bounty/token-radar-01)
(`token-radar-01`): it reads a sealed DefiLlama snapshot, ranks the pre-token protocols by
an implied launch value, and hands in a web dashboard with the board, a detail view for each
protocol, and the steps to farm it.

## The model (radar-2)

Implied value is calibrated from the snapshot itself, never from a flat constant and never
from a list of names:

```
implied = TVL x category multiple x growth x maturity x breadth
```

- **Category multiple** — the median market-cap-over-TVL of the live protocols in the same
  category, blended toward the global median with a prior weight of 3, then clamped to
  [0.05, 1.50]. Categories with no live protocol take the global median.
- **Growth** — the 7-day TVL change, clamped to [-60%, 120%], at weight 0.5.
- **Maturity** — `0.55 + 0.45 x sqrt(min(age, 1460) / 1460)`; unknown age counts as 365 days.
- **Breadth** — `1 + 0.02 x min(chains, 5)`.

The board holds 200 rows: the 40-protocol watchlist (TVL ≥ $50M, no token on record) plus
160 pre-token protocols below the floor, chosen by the model itself. Each row carries a
six-step farm plan with what it costs and how long it takes.

## Run it

Node.js 22.18 or later, standard library only, no install:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <kit>/input/snapshot.json
```

That writes `out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and
`out/dossier.json`. The dashboard is a static page with no network: open
`out/dashboard/index.html` in a browser.

## Layout

- `main.ts` — the entrypoint: reads the snapshot, writes the board and the dossier.
- `lib/model.ts` — the model, the farm plans, the board builder, the snapshot parser.
- `dashboard/` — the static page (index.html, app.css, app.js).
- `screenshots/` — the board, a protocol's detail view, and a filtered view.
- `vendor/makefun-board.ts` — make.fun's dossier library, copied from the kit.
