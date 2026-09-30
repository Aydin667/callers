/** Shared types between client and server. Amounts cross the wire as strings. */

export interface TxManifestEntry {
  index: number;
  label: string;
  signer: "you" | "platform";
  actions: string[];
}

export interface CostBreakdown {
  devBuyLamports: string;
  platformFeeLamports: string;
  jitoTipLamports: string;
  estNetworkLamports: string;
  totalLamports: string;
}

/** One line of the fee split that gets written on-chain at launch. */
export interface ShareRow {
  address: string;
  bps: number;
  role: "creator" | "caller";
  /** 1-based call order for callers */
  rank?: number;
  calledAt?: number;
}

/** Public view of a call window. */
export interface PendingView {
  id: string;
  creator: string;
  name: string;
  symbol: string;
  description: string;
  imageUri: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  devBuySol: number;
  creatorKeepBps: number;
  createdAt: number;
  closesAt: number;
  closed: boolean;
  launchedMint?: string;
  callers: { address: string; at: number; rank: number }[];
  maxCallers: number;
  /** the split as it stands right now, if launched this second */
  projectedShares: ShareRow[];
}

export interface PrepareResponse {
  sessionId: string;
  mint: string;
  symbol: string;
  devTokensRaw: string;
  devPctOfSupply: number;
  shares: ShareRow[];
  callerCount: number;
  cost: CostBreakdown;
  manifest: TxManifestEntry[];
  transactionsToSign: string[];
  dryRun: boolean;
}

export type BundleState =
  | "pending"
  | "landed"
  | "failed"
  | "expired"
  | "simulated";

export interface ExecuteResponse {
  bundleId: string;
  state: BundleState;
}

export interface StatusResponse {
  state: BundleState;
  slot?: number;
  error?: string;
  mint?: string;
}

export interface CheckResult {
  id: string;
  label: string;
  status: "ok" | "fail" | "warn" | "pending";
  detail: string;
  link?: string;
}

export interface VerificationReport {
  mint: string;
  sealed: boolean;
  checkedAt: number;
  name?: string;
  symbol?: string;
  imageUri?: string;
  creator?: string;
  launchSlot?: number;
  bundleSignature?: string;
  devBuySol?: number;
  /** the split recorded in the certificate at launch */
  originalShares?: ShareRow[];
  /** the split currently live on-chain */
  liveShares?: { address: string; bps: number }[];
  /** true when live shares still match what was promised at launch */
  sharesIntact?: boolean;
  attestation?: string;
  checks: CheckResult[];
  links: {
    pumpFun: string;
    solscan: string;
    attestation?: string;
  };
}

export interface LaunchListEntry {
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  launchedAt: number;
  callerCount: number;
  callerBps: number;
}

export interface ApiError {
  error: { code: string; message: string };
}
