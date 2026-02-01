# Bootstrap Checklist

1) Fetch Moltbook post by ID (Authorization: Bearer MOLTBOOK_KEY)
2) Verify trigger `!solclawnbot` on its own line
3) Parse JSON from ```json code block
4) Validate fields (name, symbol, wallet, description, image)
5) Enforce cooldown, unique ticker, and unused post
6) Create token via PumpPortal
7) Store proofs and return mint + tx signature
