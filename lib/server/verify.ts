import "server-only";
/**
 * Live verification for Callers launches.
 *
 * The important check is the last one. Pump.fun's fee-sharing config stays
 * editable by the coin's creator, so nobody — including us — can make a
 * split permanent. What we CAN do is record the split at launch in an
 * on-chain certificate and compare it against the live config forever after,
 * so a creator who quietly cuts their callers out is permanently visible.
 */
import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getTokenMetadata } from "@solana/spl-token";
import type { CheckResult, ShareRow, VerificationReport } from "@/lib/types";
import { getConnection } from "./rpc";
import { getPlatformKeypair } from "./env";
import { deriveAttestationAddress, deserializeSealData } from "./attest";
import { fetchSharingConfig } from "./pump";

const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { report: VerificationReport; at: number }>();

export async function verifyMint(mintStr: string): Promise<VerificationReport> {
  const c = cache.get(mintStr);
  if (c && Date.now() - c.at < CACHE_TTL_MS) return c.report;
  const report = await buildReport(mintStr);
  cache.set(mintStr, { report, at: Date.now() });
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  return report;
}

function parseSharesCsv(csv: string): ShareRow[] {
  return csv
    .split(",")
    .filter(Boolean)
    .map((part, i) => {
      const [address, bps] = part.split(":");
      return {
        address,
        bps: Number(bps),
        role: i === 0 ? ("creator" as const) : ("caller" as const),
        rank: i === 0 ? undefined : i,
      };
    });
}

async function buildReport(mintStr: string): Promise<VerificationReport> {
  const connection = getConnection();
  const mint = new PublicKey(mintStr);
  const platform = getPlatformKeypair().publicKey;
  const checks: CheckResult[] = [];

  const base: VerificationReport = {
    mint: mintStr,
    sealed: false,
    checkedAt: Date.now(),
    checks,
    links: {
      pumpFun: `https://pump.fun/coin/${mintStr}`,
      solscan: `https://solscan.io/token/${mintStr}`,
    },
  };

  // 1. Certificate
  const attAddr = await deriveAttestationAddress(platform, mint);
  const attInfo = await connection.getAccountInfo(attAddr);
  if (!attInfo) {
    checks.push({
      id: "certificate",
      label: "Callers certificate",
      status: "fail",
      detail: "No Callers certificate exists for this mint — it was not launched here.",
    });
    return base;
  }
  const dataLen = attInfo.data.readUInt32LE(97);
  const seal = await deserializeSealData(
    new Uint8Array(attInfo.data.subarray(101, 101 + dataLen)),
  );
  if (!seal || seal.mint !== mintStr) {
    checks.push({
      id: "certificate",
      label: "Callers certificate",
      status: "fail",
      detail: "Certificate exists but could not be decoded or does not match this mint.",
    });
    return base;
  }

  const original = parseSharesCsv(seal.shares_csv);
  base.attestation = attAddr.toBase58();
  base.creator = seal.creator;
  base.symbol = seal.symbol;
  base.bundleSignature = seal.launch_sig;
  base.originalShares = original;
  base.links.attestation = `https://solscan.io/account/${attAddr.toBase58()}`;

  const callerCount = Number(seal.caller_count);
  checks.push({
    id: "certificate",
    label: "Callers certificate",
    status: "ok",
    detail:
      callerCount > 0
        ? `Launched here with ${callerCount} caller${callerCount === 1 ? "" : "s"} paid in; the creator kept ${(Number(seal.creator_keep_bps) / 100).toFixed(0)}%.`
        : "Launched here, but nobody called it in time — the creator kept 100% and no split was written.",
    link: base.links.attestation,
  });

  // 2. Launch transaction
  let launchSlot: number | undefined;
  if (seal.launch_sig) {
    try {
      const tx = await connection.getTransaction(seal.launch_sig, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      launchSlot = tx?.slot;
      base.launchSlot = launchSlot;
      checks.push({
        id: "launch",
        label: "Launch confirmed",
        status: tx && !tx.meta?.err ? "ok" : "warn",
        detail:
          tx && !tx.meta?.err
            ? `Created in slot ${launchSlot}, with the split written in the same atomic bundle.`
            : "Could not fetch the launch transaction (RPC history may be pruned).",
        link: `https://solscan.io/tx/${seal.launch_sig}`,
      });
    } catch {
      /* best effort */
    }
  }

  // 3. THE check — do the live shares still match what was promised?
  if (callerCount > 0) {
    const live = await fetchSharingConfig(mint);
    if (!live) {
      checks.push({
        id: "shares",
        label: "Fee split still intact",
        status: "fail",
        detail:
          "The certificate records a caller split, but no fee-sharing config exists on-chain right now. The callers are not being paid.",
      });
      base.sharesIntact = false;
    } else {
      base.liveShares = live.shareholders;
      const norm = (rows: { address: string; bps: number }[]) =>
        [...rows]
          .map((r) => `${r.address}:${r.bps}`)
          .sort()
          .join(",");
      const intact = norm(live.shareholders) === norm(original);
      base.sharesIntact = intact;

      if (intact) {
        checks.push({
          id: "shares",
          label: "Fee split still intact",
          status: "ok",
          detail: `The live sharing config matches the launch certificate exactly — all ${callerCount} caller${callerCount === 1 ? " is" : "s are"} still being paid on every trade.`,
        });
      } else {
        const missing = original.filter(
          (o) => !live.shareholders.some((l) => l.address === o.address),
        );
        checks.push({
          id: "shares",
          label: "Fee split ALTERED",
          status: "fail",
          detail:
            `The live sharing config no longer matches the launch certificate. ` +
            (missing.length
              ? `${missing.length} original shareholder${missing.length === 1 ? " has" : "s have"} been removed. `
              : "Shares have been reweighted. ") +
            "Pump.fun lets the coin's creator edit this config, so this change came from the creator — not from Callers.",
        });
      }

      checks.push({
        id: "editable",
        label: "Can the split still change?",
        status: live.adminRevoked ? "ok" : "warn",
        detail: live.adminRevoked
          ? "The creator has revoked their admin authority — this split is now permanent."
          : "Yes. Pump.fun's fee-sharing config is editable by the coin's creator, and this one has not been revoked. Callers cannot prevent that; this page is how you find out if it happens.",
      });
    }
  }

  // Display metadata (best effort)
  try {
    const meta = await getTokenMetadata(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    if (meta) {
      base.name = meta.name;
      if (meta.uri) {
        const json = (await fetch(meta.uri, {
          signal: AbortSignal.timeout(4000),
        }).then((r) => (r.ok ? r.json() : null))) as { image?: string } | null;
        if (json?.image?.startsWith("https://")) base.imageUri = json.image;
      }
    }
  } catch {
    /* cosmetic */
  }

  base.sealed = checks.every((c) => c.status === "ok" || c.status === "warn");
  return base;
}
