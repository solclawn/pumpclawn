# Fee Router (Anchor)

Minimal on-chain router for creator fee distribution with proof storage.

## Program address
Set after deploy. Update in:
- `programs/fee-router/src/lib.rs` (`declare_id!`)
- `.env` (`FEE_ROUTER_PROGRAM_ID`)

## Instructions
- `initialize_router(mint, recipients, bps)`
- `update_router(recipients, bps)`
- `deposit(amount)`
- `distribute()`
- `set_proof(kind, sig)`
  - kind: 0=mint, 1=claim, 2=distribute

## Deploy (mainnet)
```bash
# install solana + anchor if missing
# solana-install init && anchor install

# set wallet (must hold SOL)
solana config set --keypair ~/.config/solana/id.json
solana config set --url https://api.mainnet-beta.solana.com

cd programs/fee-router
anchor build
anchor deploy
```

Copy Program ID into:
```
FEE_ROUTER_ENABLED=true
FEE_ROUTER_PROGRAM_ID=<PROGRAM_ID>
```

Restart API:
```
systemctl --user restart solclaw-api.service
```
