# LabForge TD

3D educational tower-defence built on the **devdev** platform. Vanilla ES
modules + Three.js r171 via importmap. No build step, no bundler, no backend.

**Live:** https://labforge-td.web.app
**Portal page:** https://devdev-games.web.app/games/labforge-td

## v0.1-alpha — Mars Greenhouse Defence

- Single mission: 5 waves of mixed pollution / biological / radiation threats.
- 3 towers — Solar Array (energy gen), UV Steriliser (anti-bio), Magnetic
  Emitter (anti-radiation).
- Energy economy: place enough solar to power your defence; brown-out if banked
  energy hits zero with demand exceeding supply.
- Real STEM concepts surfaced in every tooltip.

Coming in v0.2:
- Carbon Filter, Battery Bank, AI Pattern Core
- Climate Wetland mission
- Skill tree across Biology / Energy / Physics / AI branches

## Run locally

Just open `index.html` in a static server. Any of:

```bash
npx serve .
# or
python3 -m http.server 5500
```

Game requires modern browser (ES modules, WebGL).

## Deploy

```bash
firebase deploy --only hosting:labforge
```

(Site `labforge-td` lives under the `bldvolt` Firebase project alongside the
`devdev-games` portal site. Free Spark plan, multi-site hosting.)

## Manifest contract

`/manifest.json` at the deploy root is the single source of truth for the
devdev portal. Schema: https://github.com/DBAYF/devdev/blob/main/docs/MANIFEST_SCHEMA.md
