/**
 * Program IDs and protocol constants. Everything here is public information;
 * secrets live only in environment variables read by lib/server/env.ts.
 */

// Pump.fun bonding curve program (verified against pump-public-docs, Sept 2026)
export const PUMP_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
// PumpSwap AMM (graduation target)
export const PUMP_AMM_PROGRAM_ID = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
// Jupiter Lock (locker) — open-source, audited by OtterSec + Sec3
export const LOCKER_PROGRAM_ID = "LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn";
// Lighthouse assertion program — audited by OtterSec
export const LIGHTHOUSE_PROGRAM_ID = "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95";
// Solana Attestation Service (Solana Foundation)
export const SAS_PROGRAM_ID = "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG";

// SAS registry naming (deterministic PDAs from the platform authority)
export const SAS_CREDENTIAL_NAME = "Callers";
export const SAS_SCHEMA_NAME = "CallersLaunchV1";
export const SAS_SCHEMA_VERSION = 1;

// Launch constraints. A dev buy is optional here.
export const MIN_DEV_BUY_SOL = 0;
export const MAX_DEV_BUY_SOL = 10;

// ── The call mechanic ────────────────────────────────────────────────
// Pump.fun's creator fee sharing allows at most 10 shareholders total.
// The creator takes one slot, so at most 9 callers can be paid.
export const MAX_SHAREHOLDERS = 10;
export const MAX_CALLERS = 9;

/** How long the call window can stay open before the coin is launched. */
export interface CallWindow {
  id: string;
  label: string;
  minutes: number;
}
export const CALL_WINDOWS: CallWindow[] = [
  { id: "m15", label: "15 minutes", minutes: 15 },
  { id: "m30", label: "30 minutes", minutes: 30 },
  { id: "m60", label: "60 minutes", minutes: 60 },
];

/** Share of the creator fee stream the creator keeps; the rest goes to callers. */
export const CREATOR_KEEP_OPTIONS = [
  { bps: 7000, label: "70% / 30%", blurb: "you keep most of it" },
  { bps: 5000, label: "50% / 50%", blurb: "even split with your callers" },
  { bps: 3000, label: "30% / 70%", blurb: "callers take the lion's share" },
  { bps: 1000, label: "10% / 90%", blurb: "almost all of it to callers" },
];
export const MIN_CREATOR_KEEP_BPS = 1000;

/**
 * Split `callerBps` across `k` callers, weighted so earlier callers earn more
 * (weights k, k-1, … 1). Returns bps per caller, summing exactly to callerBps,
 * every entry > 0. Pump.fun rejects zero shares and requires an exact total.
 */
export function splitCallerShares(callerBps: number, k: number): number[] {
  if (k <= 0) return [];
  const weights = Array.from({ length: k }, (_, i) => k - i);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const out = weights.map((w) => Math.max(1, Math.floor((callerBps * w) / totalW)));
  let diff = callerBps - out.reduce((a, b) => a + b, 0);
  // Hand any rounding remainder to the earliest caller; claw back from the
  // last ones if flooring overshot (only possible via the max(1,...) floor).
  let i = 0;
  while (diff > 0) { out[0] += diff; diff = 0; }
  while (diff < 0) {
    const j = out.length - 1 - (i % out.length);
    if (out[j] > 1) { out[j]--; diff++; }
    i++;
  }
  return out;
}

// Jito tip accounts (public, from Jito docs)
export const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

export const SITE_NAME = "Callers";
export const SITE_TAGLINE = "The people who called it get paid.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://callerslaunch.lol";
