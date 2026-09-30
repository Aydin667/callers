import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  sniffImageMime,
} from "@/lib/validation";
import { CALL_WINDOWS, MAX_DEV_BUY_SOL, MIN_CREATOR_KEEP_BPS } from "@/lib/config";
import { createPending, listOpenPending } from "@/lib/server/calls";
import { pinImage, pinMetadata } from "@/lib/server/ipfs";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { env, hasPlatformKeypair } from "@/lib/server/env";
import { toPendingView } from "@/lib/server/pending-view";

export const runtime = "nodejs";
export const maxDuration = 60;

const err = (code: string, message: string, status = 400) =>
  NextResponse.json({ error: { code, message } }, { status });

const httpsUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be a valid https:// URL");

const schema = z.object({
  name: z.string().trim().min(1, "Token name is required").max(32),
  symbol: z
    .string()
    .trim()
    .min(1, "Ticker is required")
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, "Letters and numbers only"),
  description: z.string().trim().max(600).default(""),
  website: httpsUrl.optional().or(z.literal("")),
  twitter: httpsUrl.optional().or(z.literal("")),
  telegram: httpsUrl.optional().or(z.literal("")),
  devBuySol: z.number().min(0).max(MAX_DEV_BUY_SOL),
  creatorKeepBps: z.number().int().min(MIN_CREATOR_KEEP_BPS).max(9000),
  windowId: z.string(),
  creator: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid wallet"),
});

export async function GET() {
  return NextResponse.json({
    pending: listOpenPending().map(toPendingView),
  });
}

export async function POST(req: Request) {
  try {
    if (!rateLimit(`pending:${clientIp(req)}`, 5, 60_000)) {
      return err("RATE_LIMITED", "Too many call windows — wait a minute.", 429);
    }
    if (!hasPlatformKeypair()) {
      return err("NOT_CONFIGURED", "Server is not configured yet.", 503);
    }

    const form = await req.formData();
    const parsed = schema.safeParse({
      name: String(form.get("name") ?? ""),
      symbol: String(form.get("symbol") ?? ""),
      description: String(form.get("description") ?? ""),
      website: String(form.get("website") ?? ""),
      twitter: String(form.get("twitter") ?? ""),
      telegram: String(form.get("telegram") ?? ""),
      devBuySol: Number(form.get("devBuySol") ?? 0),
      creatorKeepBps: Number(form.get("creatorKeepBps")),
      windowId: String(form.get("windowId") ?? ""),
      creator: String(form.get("creator") ?? ""),
    });
    if (!parsed.success) {
      const f = parsed.error.issues[0];
      return err("VALIDATION", `${f.path.join(".")}: ${f.message}`);
    }
    const win = CALL_WINDOWS.find((w) => w.id === parsed.data.windowId);
    if (!win) return err("VALIDATION", "Pick a valid call window.");

    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) {
      return err("VALIDATION", "Token image is required.");
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return err("VALIDATION", "Image too large (max 4.3 MB).");
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    const mime = sniffImageMime(bytes);
    if (!mime || !ALLOWED_IMAGE_TYPES.has(mime)) {
      return err("VALIDATION", "Image must be PNG, JPEG, GIF, or WebP.");
    }

    let imageUri: string;
    let metadataUri: string;
    if (env.dryRun && !env.pinataJwt) {
      imageUri = "https://callerslaunch.lol/dryrun-image.png";
      metadataUri = "https://callerslaunch.lol/dryrun-metadata.json";
    } else {
      const ext = mime.split("/")[1];
      const pinnedImage = await pinImage(bytes, mime, `token.${ext}`);
      imageUri = pinnedImage.url;
      const pinnedMeta = await pinMetadata({
        name: parsed.data.name,
        symbol: parsed.data.symbol.toUpperCase(),
        description: parsed.data.description,
        image: imageUri,
        showName: true,
        createdOn: "https://callerslaunch.lol",
        ...(parsed.data.website ? { website: parsed.data.website } : {}),
        ...(parsed.data.twitter ? { twitter: parsed.data.twitter } : {}),
        ...(parsed.data.telegram ? { telegram: parsed.data.telegram } : {}),
      });
      metadataUri = pinnedMeta.url;
    }

    const p = createPending({
      creator: parsed.data.creator,
      name: parsed.data.name,
      symbol: parsed.data.symbol.toUpperCase(),
      description: parsed.data.description,
      website: parsed.data.website || undefined,
      twitter: parsed.data.twitter || undefined,
      telegram: parsed.data.telegram || undefined,
      metadataUri,
      imageUri,
      devBuyLamports: String(Math.round(parsed.data.devBuySol * 1e9)),
      creatorKeepBps: parsed.data.creatorKeepBps,
      closesAt: Date.now() + win.minutes * 60_000,
    });

    return NextResponse.json({ pending: toPendingView(p) });
  } catch (e) {
    console.error("pending create failed:", e);
    return err("CREATE_FAILED", "Could not open the call window.", 500);
  }
}
