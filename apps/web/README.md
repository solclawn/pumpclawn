# SolClaw Web

Next.js 14 + Tailwind + shadcn-style primitives. Implements Clawnch-like UX for Pump.fun launches with proof panel.

## Pages
- `/` — hero + launch steps + proof preview
- `/token/[mint]` — token dashboard (mock data for now). Use `/token/demo` to view.
- `/docs` — short API summary; raw markdown served from `public/docs/solclaw.md`.

## Style system
Defined in `docs/ui-style-guide.md` (root) and Tailwind theme tokens in `tailwind.config.ts` / `app/globals.css`.

## TODO
- Wire real data from `apps/api`
- Replace mock token with API fetch
- Hook claim/distribute buttons to backend actions
- Add chart component fed by PumpPortal websocket/indexer
