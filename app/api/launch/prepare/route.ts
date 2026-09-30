import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { LaunchError, prepareLaunch } from "@/lib/server/launch";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { hasPlatformKeypair } from "@/lib/server/env";
import { getConnection } from "@/lib/server/rpc";
import { env } from "@/lib/server/env";
import { getPending } from "@/lib/server/calls";

export const runtime = "nodejs";
export const maxDuration = 60;

const err = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

const schema = z.object({
  pendingId: z.string().regex(/^[a-f0-9]{16}$/),
  creator: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
});

export async function POST(req: Request) {
  try {
    if (!rateLimit(`prepare:${clientIp(req)}`, 10, 60_000)) {
      return err("RATE_LIMITED", "Too many launch attempts — wait a minute.", 429);
    }
    if (!hasPlatformKeypair()) {
      return err("NOT_CONFIGURED", "Server is not configured for launches yet.", 503);
    }
    const body = schema.safeParse(await req.json().catch(() => null));
    if (!body.success) return err("BAD_INPUT", "Malformed request.");

    const creator = new PublicKey(body.data.creator);
    const p = getPending(body.data.pendingId);
    if (!p) return err("NOT_FOUND", "That call window no longer exists.", 404);

    // Balance pre-check
    const balance = BigInt(
      await getConnection().getBalance(creator, "confirmed"),
    );
    const needed =
      BigInt(p.devBuyLamports) +
      env.platformFeeLamports +
      env.jitoTipLamports +
      12_000_000n;
    if (balance < needed) {
      return err(
        "INSUFFICIENT_SOL",
        `Wallet holds ${(Number(balance) / 1e9).toFixed(3)} SOL but the launch needs about ${(Number(needed) / 1e9).toFixed(3)} SOL.`,
      );
    }

    return NextResponse.json(
      await prepareLaunch({ pendingId: body.data.pendingId, creator }),
    );
  } catch (e) {
    if (e instanceof LaunchError) return err(e.code, e.message);
    console.error("prepare failed:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err("PREPARE_FAILED", `Could not prepare the launch: ${msg}`, 500);
  }
}
