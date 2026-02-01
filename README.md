# Solclawn

Clawnch-style launcher for Pump.fun on Solana with proof-first UX and creator-fee routing.

## What this repo contains
- `docs/solclaw.md` - product/API docs (v1.0.0)
- `docs/ui-style-guide.md` - Solclawn visual system (Clawnch vibe, Solana identity)
- `apps/web` - Next.js + Tailwind frontend (launch flow + token dashboard)
- `apps/api` - Fastify API (Moltbook post, PumpPortal create, claim/distribute)
- `programs/fee-router` - Anchor scaffold (optional onchain router)
- `packages/sdk`, `packages/ui` - shared packages (stubs)

---

## Installation (local dev)

### 1) Prerequisites
- Node.js 18+
- pnpm 10+
- A Solana wallet with SOL for gas and optional dev buy
- PumpPortal API key + claim wallet secret (from PumpPortal)
- Moltbook agent API key (bot account)

### 2) Install deps
```bash
pnpm install
```

### 3) Configure environment
Copy and fill:
```bash
cp .env.example .env
```

Required values in `.env`:
```
PUMPPORTAL_API_KEY=...
CLAIM_WALLET_SECRET=...
MOLTBOOK_API_KEY=...
PLATFORM_WALLET=...
```

Optional (recommended):
```
RPC_URL=https://api.mainnet-beta.solana.com
PRIORITY_FEE_SOL=0.00005
DEFAULT_DEV_BUY_SOL=0.1
```

Frontend env:
```bash
cp apps/web/.env.local.example apps/web/.env.local
```

### 4) Run locally
```bash
pnpm run dev:api  # http://localhost:4000
pnpm run dev:web  # http://localhost:3000
```

---

## Usage (end-to-end flow)

### Step A - Create Moltbook post (agent publishes via API)
From the Solclawn UI:
1) Connect Phantom
2) Fill in token fields (name, symbol, description, image, optional socials)
3) Click **Create post**
   - This creates a Moltbook post with `!solclawnbot` + JSON

### Step B - Launch
1) The UI auto-fills the **Moltbook post ID**
2) Click **Launch via Moltbook**
3) Phantom signs the transaction
4) The token appears on Pump.fun and the UI shows proof

The JSON embedded in the Moltbook post looks like:
```
!solclawnbot
```json
{
  "name": "My Token",
  "symbol": "TICKER",
  "wallet": "YourSolanaWalletPubkey",
  "description": "Token description",
  "image": "https://direct-image-url.png",
  "website": "https://yourdomain.com",
  "twitter": "https://x.com/yourhandle",
  "telegram": "https://t.me/yourgroup"
}
```
```

---

## Free launches and fees (how it works)

**Free to launch** means Solclawn does not charge a platform fee and does not pay deployment costs.
The **user wallet pays**:
- Solana network fees (small)
- Optional **dev buy** amount (default 0.1 SOL; configurable)

**Creator fees on Pump.fun**:
- Pump.fun accumulates **creator fees** for the token
- Solclawn can **claim** those creator fees via PumpPortal
- Claimed fees are split **80% to the creator wallet** and **20% to the platform wallet** (configurable)

This is the only fee share Solclawn claims. It does not control global trading fees.

---

## Production notes
- Use a dedicated RPC with higher limits (public RPC can 403).
- Keep `CLAIM_WALLET_SECRET` and `MOLTBOOK_API_KEY` in secret storage.
- If using the fee router program, deploy it and update the API accordingly.

---

## Non-negotiable UX checkpoints
1. Launch saves mint and shows proof panel.
2. Claim shows signature in UI.
3. Distribute shows signature + split amounts.
4. Every signature/address has copy + explorer link.
