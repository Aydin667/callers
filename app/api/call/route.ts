import { NextResponse } from "next/server";
import { z } from "zod";
import { getPending, registerCall } from "@/lib/server/calls";
import { toPendingView } from "@/lib/server/pending-view";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";

const schema = z.object({
  pendingId: z.string().regex(/^[a-f0-9]{16}$/),
  address: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  signature: z.string().min(64).max(128),
});

export async function POST(req: Request) {
  if (!rateLimit(`call:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Slow down." } },
      { status: 429 },
    );
  }
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: { code: "BAD_INPUT", message: "Malformed call." } },
      { status: 400 },
    );
  }
  const result = registerCall(
    body.data.pendingId,
    body.data.address,
    body.data.signature,
  );
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: 400 },
    );
  }
  const p = getPending(body.data.pendingId)!;
  return NextResponse.json({ position: result.position, pending: toPendingView(p) });
}
