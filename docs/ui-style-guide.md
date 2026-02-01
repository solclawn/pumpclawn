# SolClaw UI Style Guide

Clawnch vibe, Solana identity: minimal, dark, "terminal + neon" yet clean. Proof-first UX with tx links always visible.

## Visual Intent
- Serious builder tool; fast onboarding.
- Proof-first: every critical value includes explorer links + copy.

## Layout
- Max width 1040px desktop; full-width mobile.
- Fixed header with CTA trio: Launch, Tokens, Docs.
- Hero (above the fold): 1-line title, 2-line subtitle, "Launch in 30s" box with 4 bullet steps.
- Token page: two columns — left (Token card + chart placeholder), right (Fee card + Split card + Proof card).

## Typography
- Headings: Space Grotesk or Sora
- Body: Inter
- Mono: JetBrains Mono
- Scale: H1 44/48, H2 28/34, Body 16/24, Small 13/18, Mono 13/18

## Colors (Solana-ish, restrained)
- Background: #0B0F14
- Surface: #0F1620
- Border: rgba(255,255,255,0.08)
- Text primary: rgba(255,255,255,0.92)
- Text secondary: rgba(255,255,255,0.62)
- Accent gradient (use sparingly: primary CTA, "Verified" badge, progress, hover highlights): #14F195 → #9945FF

## Components (minimum set)
- Buttons: primary (gradient + light glow), secondary (outline), tertiary (ghost).
- Cards: 1px border, 16px corners, soft shadow.
- Badges: Verified, Pending, Error.
- Stepper: 4 steps — Draft, Minted, Claimed, Distributed.
- Proof row: label + monospace value + copy button + explorer link.
- Split editor: recipients list + percent; must sum to 100% with validation.
- Toast: success/error, concise text.

## Microcopy
- Short sentences, no emoji, no absolute promises.
- Always mention proof.
- Examples:
  - "Creator fees are claimed, then routed onchain."
  - "Every distribution is verifiable by signature."

## Motion
- Only micro: hover, loading shimmer, stepper progress. Avoid heavy animations.

## Credibility Anchors (must show on every token page)
- Mint address
- Creator wallet
- Router PDA
- Last claim signature
- Last distribute signature

Each anchor row includes copy + explorer link; if absent, display "Not executed yet".
