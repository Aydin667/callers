import "server-only";
import type { PendingView } from "@/lib/types";
import { MAX_CALLERS } from "@/lib/config";
import { computeShares } from "./launch";
import type { PendingLaunch } from "./calls";

/** Public projection of a pending launch — never exposes call signatures. */
export function toPendingView(p: PendingLaunch): PendingView {
  return {
    id: p.id,
    creator: p.creator,
    name: p.name,
    symbol: p.symbol,
    description: p.description,
    imageUri: p.imageUri,
    website: p.website,
    twitter: p.twitter,
    telegram: p.telegram,
    devBuySol: Number(p.devBuyLamports) / 1e9,
    creatorKeepBps: p.creatorKeepBps,
    createdAt: p.createdAt,
    closesAt: p.closesAt,
    closed: Date.now() > p.closesAt,
    launchedMint: p.launchedMint,
    callers: p.calls.map((c, i) => ({
      address: c.address,
      at: c.at,
      rank: i + 1,
    })),
    maxCallers: MAX_CALLERS,
    projectedShares: computeShares(p),
  };
}
