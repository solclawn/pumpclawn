# SolClaw API

Fastify + TypeScript stub implementing the documented endpoints. In-memory storage for now; replace with DB + PumpPortal + Anchor wiring.

## Run dev
```bash
cd apps/api
pnpm install
cp ../../.env.example .env   # fill values
pnpm run dev
```

## Endpoints
- POST `/api/launch` — prepare unsigned Pump.fun create tx (user signs)
- POST `/api/launch/confirm` — submit mint tx signature for proofs
- POST `/api/moltbook/post` — create Moltbook post (agent publishes via API)
- GET `/api/token/:mint` — token details
- GET `/api/tokens` — list
- POST `/api/fees/claim` — mock claim signature + amount
- POST `/api/fees/distribute` — sends lamports from claim wallet to recipients pro‑rata
- GET `/api/fees/:mint` — claimable + last proofs
- GET `/api/stats` — aggregate stats + top tokens
- GET `/api/health` — health check
- POST `/api/upload` — image upload (base64, URL, or multipart → pump.fun IPFS)

## Next steps
1. Anchor router: replace direct SOL splits with router `deposit+distribute` CPI once program is deployed.
2. Persist to DB (SQLite/Postgres) instead of in-memory map.
3. Add signature polling to recalc claimable from chain when claim tx confirms.
4. Harden env/secret handling (vault) and add rate limiting.
