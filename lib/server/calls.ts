import "server-only";
/**
 * Pending launches and their call windows.
 *
 * A creator opens a call window BEFORE the coin exists. Anyone can then
 * "call" it by signing a message with their wallet — that signature proves
 * they control the address, and being early is what earns a share of the
 * coin's creator-fee stream once it launches.
 *
 * Stored in memory (per instance). A pending launch is short-lived by design
 * — the call window caps out at 60 minutes — but it does NOT survive a
 * deploy or restart. That limitation is documented on the site and in the
 * README rather than hidden.
 */
import { randomBytes } from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { MAX_CALLERS } from "@/lib/config";

export interface Call {
  /** base58 wallet address of the caller */
  address: string;
  /** unix ms when the call was registered */
  at: number;
  /** their base58 signature over the call message */
  signature: string;
}

export interface PendingLaunch {
  id: string;
  creator: string;
  name: string;
  symbol: string;
  description: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  metadataUri: string;
  imageUri: string;
  devBuyLamports: string;
  creatorKeepBps: number;
  createdAt: number;
  /** unix ms when the call window shuts */
  closesAt: number;
  calls: Call[];
  /** set once the coin is actually launched */
  launchedMint?: string;
}

const TTL_MS = 6 * 60 * 60 * 1000; // keep closed windows around a while
const g = globalThis as unknown as { __callers_pending?: Map<string, PendingLaunch> };
const pending: Map<string, PendingLaunch> = (g.__callers_pending ??= new Map());

function sweep() {
  const now = Date.now();
  for (const [id, p] of pending) {
    if (now - p.createdAt > TTL_MS) pending.delete(id);
  }
}

export function createPending(
  data: Omit<PendingLaunch, "id" | "createdAt" | "calls">,
): PendingLaunch {
  sweep();
  const id = randomBytes(8).toString("hex");
  const p: PendingLaunch = { ...data, id, createdAt: Date.now(), calls: [] };
  pending.set(id, p);
  return p;
}

export function getPending(id: string): PendingLaunch | undefined {
  sweep();
  return pending.get(id);
}

export function listOpenPending(): PendingLaunch[] {
  sweep();
  const now = Date.now();
  return [...pending.values()]
    .filter((p) => !p.launchedMint && p.closesAt > now)
    .sort((a, b) => a.closesAt - b.closesAt);
}

/** The exact message a caller signs. Bound to the pending id and address. */
export function callMessage(pendingId: string, address: string): string {
  return `Callers: I am calling launch ${pendingId} as ${address}`;
}

export type CallResult =
  | { ok: true; position: number; total: number }
  | { ok: false; code: string; message: string };

export function registerCall(
  pendingId: string,
  address: string,
  signatureB58: string,
): CallResult {
  const p = getPending(pendingId);
  if (!p) return { ok: false, code: "NOT_FOUND", message: "That call window does not exist (it may have expired)." };
  if (p.launchedMint) return { ok: false, code: "LAUNCHED", message: "This coin has already launched — calls are closed." };
  if (Date.now() > p.closesAt) return { ok: false, code: "CLOSED", message: "The call window has closed." };
  if (address === p.creator)
    return { ok: false, code: "IS_CREATOR", message: "The creator already has a share and cannot call their own window." };
  if (p.calls.some((c) => c.address === address))
    return { ok: false, code: "ALREADY", message: "This wallet has already called it." };
  if (p.calls.length >= MAX_CALLERS)
    return { ok: false, code: "FULL", message: `All ${MAX_CALLERS} caller slots are taken.` };

  // Verify the signature really comes from that wallet.
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(address);
  } catch {
    return { ok: false, code: "BAD_ADDRESS", message: "Invalid wallet address." };
  }
  let sig: Uint8Array;
  try {
    sig = bs58.decode(signatureB58);
  } catch {
    return { ok: false, code: "BAD_SIG", message: "Invalid signature encoding." };
  }
  const msg = new TextEncoder().encode(callMessage(pendingId, address));
  const valid = nacl.sign.detached.verify(msg, sig, pubkey.toBytes());
  if (!valid) return { ok: false, code: "BAD_SIG", message: "Signature does not match that wallet." };

  p.calls.push({ address, at: Date.now(), signature: signatureB58 });
  return { ok: true, position: p.calls.length, total: p.calls.length };
}

export function markLaunched(pendingId: string, mint: string): void {
  const p = getPending(pendingId);
  if (p) p.launchedMint = mint;
}
