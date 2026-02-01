# Fee Router (Anchor)

Spec-only scaffold. Implements trust-minimized split of creator fee proceeds.

## Program state
- authority: Pubkey
- recipients: Vec<Pubkey>
- bps: Vec<u16> (sum = 10_000)
- vault: PDA (lamports)
- bump

## Instructions
- initialize_router(recipients, bps)
- update_router(recipients, bps) — authority only
- deposit() — move lamports into vault
- distribute() — split vault balance by bps to recipients

## Events
- RouterInitialized
- RouterUpdated
- Deposited
- Distributed

## TODO
- Run `anchor init fee-router` inside this folder
- Implement PDA vault + CPI-safe transfers
- Add unit tests for bps sum & empty vault guard
- Expose IDL for `packages/sdk`
