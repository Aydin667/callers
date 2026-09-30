import "server-only";
/**
 * Launch orchestrator — builds and executes a Callers launch bundle.
 *
 * Bundle layout (atomic, one slot, all-or-nothing):
 *   tx1 (creator wallet + mint keypair)  create_v2 [+ dev buy]
 *   tx2 (creator wallet)                 create_fee_sharing_config
 *                                        + update_fee_shares_v2  ← the callers
 *   tx3 (creator wallet)                 platform fee + Jito tip
 *   tx4 (platform key, rebuilt at execute) SAS certificate of the split
 *
 * tx2 is omitted entirely when nobody called the coin: with no callers there
 * is nothing to share, so the coin stays a plain Pump.fun launch.
 */
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import bs58 from "bs58";
import type {
  CostBreakdown,
  PrepareResponse,
  ShareRow,
  TxManifestEntry,
} from "@/lib/types";
import { splitCallerShares } from "@/lib/config";
import { env, getPlatformKeypair } from "./env";
import { getConnection } from "./rpc";
import {
  buildCreateAndBuyInstructions,
  buildCreateFeeSharingConfigInstruction,
  buildUpdateFeeSharesInstruction,
  computeNewCurveBuyAmount,
} from "./pump";
import { buildCreateAttestationInstruction } from "./attest";
import { buildTipInstruction, sendBundle } from "./jito";
import { getPending, markLaunched, type PendingLaunch } from "./calls";
import {
  createSession,
  getSession,
  rememberBundle,
  type LaunchSession,
} from "./session";

const EST_NETWORK_LAMPORTS = 5_000_000n;

/** Build the share table for a pending launch, as it stands right now. */
export function computeShares(p: PendingLaunch): ShareRow[] {
  const callers = p.calls.slice(0, 9);
  if (callers.length === 0) {
    return [{ address: p.creator, bps: 10000, role: "creator" }];
  }
  const callerBps = 10000 - p.creatorKeepBps;
  const each = splitCallerShares(callerBps, callers.length);
  return [
    { address: p.creator, bps: p.creatorKeepBps, role: "creator" },
    ...callers.map((c, i) => ({
      address: c.address,
      bps: each[i],
      role: "caller" as const,
      rank: i + 1,
      calledAt: c.at,
    })),
  ];
}

function toV0Tx(
  payer: PublicKey,
  blockhash: string,
  instructions: TransactionInstruction[],
): VersionedTransaction {
  const msg = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  return new VersionedTransaction(msg);
}

const b64 = (tx: VersionedTransaction) =>
  Buffer.from(tx.serialize()).toString("base64");

export class LaunchError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function prepareLaunch(args: {
  pendingId: string;
  creator: PublicKey;
}): Promise<PrepareResponse> {
  const p = getPending(args.pendingId);
  if (!p) {
    throw new LaunchError("NOT_FOUND", "That call window no longer exists.");
  }
  if (p.launchedMint) {
    throw new LaunchError("ALREADY_LAUNCHED", "This coin has already launched.");
  }
  if (p.creator !== args.creator.toBase58()) {
    throw new LaunchError(
      "NOT_CREATOR",
      "Only the wallet that opened the call window can launch it.",
    );
  }

  const connection = getConnection();
  const platform = getPlatformKeypair();
  const mint = Keypair.generate();
  const nowTs = Math.floor(Date.now() / 1000);
  const devBuyLamports = BigInt(p.devBuyLamports);

  let tokensRaw = new BN(0);
  let totalSupply = new BN(1_000_000_000_000_000);
  if (devBuyLamports > 0n) {
    const q = await computeNewCurveBuyAmount(devBuyLamports);
    tokensRaw = q.tokensRaw;
    totalSupply = q.totalSupply;
  }

  const shares = computeShares(p);
  const callerRows = shares.filter((s) => s.role === "caller");

  // tx1 — create (+ dev buy)
  const createBuyIxs = await buildCreateAndBuyInstructions({
    mint: mint.publicKey,
    name: p.name,
    symbol: p.symbol,
    uri: p.metadataUri,
    creator: args.creator,
    user: args.creator,
    tokensRaw,
    solLamports: devBuyLamports,
  });
  const tx1 = toV0Tx(args.creator, "11111111111111111111111111111111", [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ...createBuyIxs,
  ]);

  // tx2 — the split (only when somebody actually called it)
  let tx2: VersionedTransaction | null = null;
  if (callerRows.length > 0) {
    const cfgIx = await buildCreateFeeSharingConfigInstruction({
      creator: args.creator,
      mint: mint.publicKey,
    });
    const shareIx = await buildUpdateFeeSharesInstruction({
      authority: args.creator,
      mint: mint.publicKey,
      shareholders: shares.map((s) => ({
        address: new PublicKey(s.address),
        shareBps: s.bps,
      })),
    });
    tx2 = toV0Tx(args.creator, "11111111111111111111111111111111", [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      cfgIx,
      shareIx,
    ]);
  }

  // tx3 — fees
  const tx3 = toV0Tx(args.creator, "11111111111111111111111111111111", [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 40_000 }),
    SystemProgram.transfer({
      fromPubkey: args.creator,
      toPubkey: platform.publicKey,
      lamports: env.platformFeeLamports,
    }),
    buildTipInstruction(args.creator, env.jitoTipLamports),
  ]);

  // Real blockhash for every transaction.
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const rebuild = (tx: VersionedTransaction) => {
    const m = TransactionMessage.decompile(tx.message);
    return toV0Tx(args.creator, blockhash, m.instructions);
  };
  const finalTx1 = rebuild(tx1);
  const finalTx2 = tx2 ? rebuild(tx2) : null;
  const finalTx3 = rebuild(tx3);

  const attestationTx = await buildAttestationTx({
    platform,
    mint: mint.publicKey,
    creator: args.creator,
    symbol: p.symbol,
    creatorKeepBps: callerRows.length > 0 ? p.creatorKeepBps : 10000,
    shares,
    launchSig: "",
    launchedAt: nowTs,
    blockhash,
  });

  const pctOfSupply = tokensRaw.isZero()
    ? 0
    : Number((tokensRaw.muln(10_000).div(totalSupply).toNumber() / 100).toFixed(2));

  const cost: CostBreakdown = {
    devBuyLamports: devBuyLamports.toString(),
    platformFeeLamports: env.platformFeeLamports.toString(),
    jitoTipLamports: env.jitoTipLamports.toString(),
    estNetworkLamports: EST_NETWORK_LAMPORTS.toString(),
    totalLamports: (
      devBuyLamports +
      env.platformFeeLamports +
      env.jitoTipLamports +
      EST_NETWORK_LAMPORTS
    ).toString(),
  };

  const unsigned = [b64(finalTx1)];
  const manifest: TxManifestEntry[] = [
    {
      index: 1,
      label: "Create the coin",
      signer: "you",
      actions: [
        `Create ${p.symbol} on Pump.fun (create_v2)`,
        devBuyLamports > 0n
          ? `Buy ${formatTokens(tokensRaw)} ${p.symbol} for ${lamportsToSol(devBuyLamports)} SOL — same transaction as creation`
          : "No dev buy",
      ],
    },
  ];
  if (finalTx2) {
    unsigned.push(b64(finalTx2));
    manifest.push({
      index: 2,
      label: "Pay your callers",
      signer: "you",
      actions: [
        `Route this coin's creator fees to a sharing config (${shares.length} shareholders)`,
        `You keep ${(p.creatorKeepBps / 100).toFixed(0)}%; ${callerRows.length} caller${callerRows.length === 1 ? "" : "s"} split ${((10000 - p.creatorKeepBps) / 100).toFixed(0)}%, weighted by who called first`,
        "From here Pump.fun pays them directly on every trade — we never hold the money",
      ],
    });
  }
  unsigned.push(b64(finalTx3));
  manifest.push({
    index: unsigned.length,
    label: "Fees",
    signer: "you",
    actions: [
      `Platform fee ${lamportsToSol(env.platformFeeLamports)} SOL + Jito tip ${lamportsToSol(env.jitoTipLamports)} SOL`,
    ],
  });
  manifest.push({
    index: unsigned.length + 1,
    label: "Certificate",
    signer: "platform",
    actions: [
      "Callers records the split on-chain (Solana Attestation Service) so any later change to it is detectable — paid by the platform",
    ],
  });

  const session = createSession({
    creator: args.creator.toBase58(),
    mint,
    unsignedTxs: unsigned,
    attestationTx: b64(attestationTx),
    meta: {
      pendingId: p.id,
      name: p.name,
      symbol: p.symbol,
      metadataUri: p.metadataUri,
      devBuyLamports: devBuyLamports.toString(),
      tokensRaw: tokensRaw.toString(),
      creatorKeepBps: callerRows.length > 0 ? p.creatorKeepBps : 10000,
      shares,
    },
  });

  return {
    sessionId: session.id,
    mint: mint.publicKey.toBase58(),
    symbol: p.symbol,
    devTokensRaw: tokensRaw.toString(),
    devPctOfSupply: pctOfSupply,
    shares,
    callerCount: callerRows.length,
    cost,
    manifest,
    transactionsToSign: session.unsignedTxs,
    dryRun: env.dryRun,
  };
}

function sharesCsv(shares: ShareRow[]): string {
  return shares.map((s) => `${s.address}:${s.bps}`).join(",");
}

async function buildAttestationTx(args: {
  platform: Keypair;
  mint: PublicKey;
  creator: PublicKey;
  symbol: string;
  creatorKeepBps: number;
  shares: ShareRow[];
  launchSig: string;
  launchedAt: number;
  blockhash: string;
}): Promise<VersionedTransaction> {
  const { instruction } = await buildCreateAttestationInstruction({
    platformAuthority: args.platform.publicKey,
    mint: args.mint,
    data: {
      mint: args.mint.toBase58(),
      creator: args.creator.toBase58(),
      symbol: args.symbol,
      creator_keep_bps: BigInt(args.creatorKeepBps),
      caller_count: BigInt(args.shares.filter((s) => s.role === "caller").length),
      shares_csv: sharesCsv(args.shares),
      launch_sig: args.launchSig,
      launched_at: BigInt(args.launchedAt),
    },
  });
  return toV0Tx(args.platform.publicKey, args.blockhash, [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 120_000 }),
    instruction,
  ]);
}

export async function executeLaunch(args: {
  sessionId: string;
  signedTxs: string[];
}): Promise<{ bundleId: string; state: "pending" | "simulated" }> {
  const session = getSession(args.sessionId);
  if (!session) {
    throw new LaunchError(
      "SESSION_NOT_FOUND",
      "Launch session expired or unknown — rebuild the launch and try again.",
    );
  }
  if (session.consumed && session.bundleId) {
    return { bundleId: session.bundleId, state: "pending" };
  }
  if (args.signedTxs.length !== session.unsignedTxs.length) {
    throw new LaunchError("BAD_INPUT", "Wrong number of signed transactions.");
  }

  const signed = args.signedTxs.map((b) =>
    VersionedTransaction.deserialize(Buffer.from(b, "base64")),
  );
  for (let i = 0; i < signed.length; i++) {
    const issued = VersionedTransaction.deserialize(
      Buffer.from(session.unsignedTxs[i], "base64"),
    );
    if (
      !Buffer.from(signed[i].message.serialize()).equals(
        Buffer.from(issued.message.serialize()),
      )
    ) {
      throw new LaunchError(
        "TX_MISMATCH",
        `Transaction ${i + 1} does not match what was issued. Refusing to co-sign.`,
      );
    }
  }

  const [tx1] = signed;
  tx1.sign([session.mint]);

  const platform = getPlatformKeypair();
  const launchSig = bs58.encode(tx1.signatures[0]);
  const issuedLast = VersionedTransaction.deserialize(
    Buffer.from(session.attestationTx, "base64"),
  );
  const blockhash = issuedLast.message.recentBlockhash;
  const certTx = await rebuildAttestation(session, platform, blockhash, launchSig);
  if (!certTx) {
    throw new LaunchError(
      "ATTESTATION_BUILD_FAILED",
      "Could not build the certificate transaction.",
    );
  }
  certTx.sign([platform]);

  session.consumed = true;
  const bundle = [...signed, certTx];

  if (env.dryRun) {
    await simulateDryRun(bundle);
    const id = `dryrun-${session.id}`;
    session.bundleId = id;
    rememberBundle(id, session.mint.publicKey.toBase58());
    markLaunched(session.meta.pendingId, session.mint.publicKey.toBase58());
    return { bundleId: id, state: "simulated" };
  }

  const bundleId = await sendBundle(bundle);
  session.bundleId = bundleId;
  rememberBundle(bundleId, session.mint.publicKey.toBase58());
  markLaunched(session.meta.pendingId, session.mint.publicKey.toBase58());
  return { bundleId, state: "pending" };
}

async function simulateDryRun(txs: VersionedTransaction[]): Promise<void> {
  const connection = getConnection();
  try {
    const res = await fetch(env.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "simulateBundle",
        params: [
          {
            encodedTransactions: txs.map((t) =>
              Buffer.from(t.serialize()).toString("base64"),
            ),
          },
          { skipSigVerify: true, replaceRecentBlockhash: true, encoding: "base64" },
        ],
      }),
    });
    const json = (await res.json()) as {
      result?: {
        value?: {
          summary?: unknown;
          transactionResults?: Array<{ err: unknown; logs?: string[] }>;
        };
      };
      error?: { message?: string };
    };
    if (!json.error && json.result?.value) {
      const summary = json.result.value.summary;
      if (summary && summary !== "succeeded" && typeof summary === "object") {
        const logs = (json.result.value.transactionResults ?? [])
          .flatMap((r) => r.logs ?? [])
          .slice(-6)
          .join(" | ");
        throw new LaunchError(
          "SIMULATION_FAILED",
          `Bundle simulation failed: ${JSON.stringify(summary).slice(0, 300)} — logs: ${logs}`,
        );
      }
      return;
    }
  } catch (e) {
    if (e instanceof LaunchError) throw e;
  }
  const sim = await connection.simulateTransaction(txs[0], {
    sigVerify: false,
    replaceRecentBlockhash: true,
  });
  if (sim.value.err) {
    throw new LaunchError(
      "SIMULATION_FAILED",
      `Dry-run simulation failed: ${JSON.stringify(sim.value.err)} — logs: ${(sim.value.logs ?? []).slice(-5).join(" | ")}`,
    );
  }
}

async function rebuildAttestation(
  session: LaunchSession,
  platform: Keypair,
  blockhash: string,
  launchSig: string,
): Promise<VersionedTransaction | null> {
  try {
    return await buildAttestationTx({
      platform,
      mint: session.mint.publicKey,
      creator: new PublicKey(session.creator),
      symbol: session.meta.symbol,
      creatorKeepBps: session.meta.creatorKeepBps,
      shares: session.meta.shares,
      launchSig,
      launchedAt: Math.floor(Date.now() / 1000),
      blockhash,
    });
  } catch {
    return null;
  }
}

const lamportsToSol = (l: bigint) =>
  (Number(l) / 1e9).toLocaleString("en-US", { maximumFractionDigits: 4 });
const formatTokens = (raw: BN) =>
  Number(raw.div(new BN(1_000_000)).toString()).toLocaleString("en-US");
