# Callers — the people who called it get paid

**callerslaunch.lol** is a Pump.fun launchpad where a share of a coin's
creator fees goes to whoever called the coin **before it existed**.

1. A creator opens a **call window** (15/30/60 min) and picks how much of
   their creator-fee stream callers will get. The coin does not exist yet.
2. Anyone **calls** it by signing a message with their wallet — free, no
   transaction. The signature proves they control the address that gets paid.
3. At launch, the first callers are written into the coin's **Pump.fun
   fee-sharing config** in the same atomic Jito bundle that creates the coin,
   weighted so the earliest caller earns the most.
4. From then on **Pump.fun pays them directly** on every trade. Nothing
   routes through us.

Up to **9 callers** — Pump.fun's fee sharing supports 10 shareholders and the
creator takes one slot.

The difference from creator-assigned fee splitting (e.g. Bags) is that shares
here are **earned permissionlessly by being early**, not handed out by the dev.

> ### The caveat we do not bury
> Pump.fun lets a coin's creator **edit their fee-sharing config after
> launch**, and no launchpad — including this one — can take that power away.
> A creator can cut their callers out later. What we do instead: record the
> original split in an on-chain certificate at launch and compare it against
> the live config forever. If it changes, the coin's page shows **ALTERED** in
> red, permanently. We make abuse visible, not impossible.
>
> Also true: a fee share of a coin that never trades is worth nothing, and a
> creator can call their own coin from alt wallets. Every caller address is
> public.

## What makes it unique

- Tokens are **real Pump.fun tokens** — same program
  (`6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`), same bonding curve, same
  PumpSwap graduation.
- **No custom smart contract.** The launch composes Pump.fun's own programs
  (create_v2 + fee sharing) and the Solana Attestation Service. Our code only
  builds transactions the creator signs in their own wallet.
- **We never custody fees.** Payouts are Pump.fun's native fee distribution
  straight to each shareholder — we are not in the money path at all.
- **No database.** Launches are enumerated from the on-chain attestations
  under our SAS credential; the verifier recomputes every check against live
  chain state. The public record *is* the record.
- **Public verifier API** for terminals and TG bots:
  `GET /api/verify/<mint>`, `GET /api/launches`.

## Architecture

```
Next.js 15 (App Router, TS, Tailwind 4)
├── app/                  pages: / /launch /launches /t/[mint] /how /terms /privacy
├── app/api/
│   ├── launch/prepare    validate → pin image+metadata to IPFS (Pinata) →
│   │                     build the 3-tx bundle → return unsigned txs + manifest
│   ├── launch/execute    verify returned txs byte-match what we issued →
│   │                     co-sign (mint keypair, platform key) → send Jito bundle
│   ├── launch/status     Jito bundle status polling
│   ├── verify/[mint]     public live verification report (CORS-open)
│   └── launches          chain-derived launch list (CORS-open)
├── lib/server/           chain layer:
│   ├── pump.ts           @pump-fun/pump-sdk create_v2+buy, curve math
│   ├── calls.ts          call windows + ed25519 signature verification
│   ├── attest.ts         SAS credential/schema/attestation (sas-lib)
│   ├── jito.ts           bundle assembly/submission/status
│   ├── verify.ts         chain state → verification report
│   └── launch.ts         orchestrator (prepare/execute)
└── scripts/
    ├── gen-key.mjs       generate the platform keypair
    ├── setup-sas.mjs     one-time SAS credential+schema creation
    └── gen-branding.mjs  deterministic pixel-art brand assets
```

Signing model: the creator signs tx1+tx2 via their wallet
(`signAllTransactions`); the server contributes the mint keypair (required
signer of `create_v2`) and the platform key (certificate tx). The server **refuses to co-sign** any transaction whose message bytes
differ from what it issued.

The platform key custodies nothing: it issues attestations (paying ~0.003 SOL
rent per launch), receives the flat platform fee, and holds no user funds.

## Local setup

```bash
npm install
cp .env.example .env.local        # fill in values (see below)
node scripts/gen-key.mjs          # → PLATFORM_KEYPAIR for .env.local
npm run dev
```

Set `DRY_RUN=1` to exercise the full pipeline against mainnet state without
spending SOL (transactions are simulated, never sent — no token is created).
With a Helius RPC the dry run uses `simulateBundle` to validate all three
transactions statefully; on RPCs without it, tx1 is simulated alone.

### Environment variables

| Var | Purpose |
|---|---|
| `SOLANA_RPC_URL` | Server-side RPC (Helius recommended; needs `getProgramAccounts`) |
| `PLATFORM_KEYPAIR` | base58 secret key — attestation issuer + fee receiver. Fund with ~0.05 SOL |
| `PINATA_JWT`, `PINATA_GATEWAY` | IPFS pinning for token image + metadata |
| `JITO_BLOCK_ENGINE_URL` | default `https://mainnet.block-engine.jito.wtf` |
| `JITO_TIP_LAMPORTS` | default 1000000 (0.001 SOL) |
| `PLATFORM_FEE_LAMPORTS` | default 20000000 (0.02 SOL) |
| `DRY_RUN` | `1` = simulate only |
| `NEXT_PUBLIC_SITE_URL` | canonical origin |

### One-time chain setup

After funding the platform key:

```bash
SOLANA_RPC_URL=... PLATFORM_KEYPAIR=... node scripts/setup-sas.mjs
```

creates the `Callers` SAS credential and `CallersLaunchV1` schema
(idempotent).

## Pump.fun integration

Direct on-chain integration via the official `@pump-fun/pump-sdk` v2
(`createV2AndBuyInstructions`) against the published IDLs in
[pump-fun/pump-public-docs](https://github.com/pump-fun/pump-public-docs). No
PumpPortal or reverse-engineered endpoints. New pump mints are Token-2022;
the escrow leg is built Token-2022-native. Metadata is a Metaplex-style JSON
pinned to IPFS (the old `pump.fun/api/ipfs` endpoint is defunct).

Dev-buy token amounts are deterministic because the bundle guarantees the
buy is the curve's first trade — computed with the SDK's own curve math from
the on-chain `Global` + fee config.

## Deployment (Render)

- Build: `npm ci && npm run build` — Start: `npm start`
- Health check: `/api/health`
- Set all env vars in the Render dashboard (never commit them).
- In-memory session/caches are per-instance: run a single instance (the
  free/starter tiers do). Sessions are 10-minute launch flows; loss on deploy
  is harmless (prepare again).

## Domain

`callerslaunch.lol` (Porkbun) → Render custom domain. Apex `callerslaunch.lol` is
canonical; `www` redirects. DNS: apex A/ALIAS per Render's instructions +
`www` CNAME to the service host.

## Troubleshooting

- **`SESSION_NOT_FOUND` on execute** — the 10-minute launch session expired
  or the instance restarted; rebuild the launch (nothing landed on-chain).
- **Bundle `expired`** — didn't land before blockhash expiry (congestion/low
  tip). Atomic: nothing happened; retry, optionally raise `JITO_TIP_LAMPORTS`.
- **`launches` empty** — RPC must support `getProgramAccounts` with memcmp
  filters (public RPC often rejects; use Helius).
- **Attestation tx fails** — platform key unfunded, or `setup-sas.mjs` not
  run yet.
- **Verify page shows SPLIT ALTERED** — the creator edited the fee config
  after launch. Working as intended: that is the whole point of the check.
- **A call window 404s** — windows live in server memory and do not survive a
  restart or deploy. That is why the longest window is 60 minutes.

## Repository docs

- `docs/research.md` — ecosystem research with sources
- `docs/concepts.md` — the 10 candidate concepts + selection rationale
- `docs/product-spec.md` — full product spec
- `docs/architecture.md` — deeper architecture notes
- `docs/brand.md`, `docs/x-branding.md` — brand system + X package
- `docs/launch-checklist.md` — go-live QA checklist

## Disclaimers

Callers is not affiliated with Pump.fun. A seal proves the creator's
declared allocation is locked; it does not prevent third-party snipers or
outside-funded wallets, and it is not investment advice. Memecoins are
extremely risky.
