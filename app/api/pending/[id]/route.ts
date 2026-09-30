import { NextResponse } from "next/server";
import { getPending } from "@/lib/server/calls";
import { toPendingView } from "@/lib/server/pending-view";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9]{16}$/.test(id)) {
    return NextResponse.json(
      { error: { code: "BAD_ID", message: "Invalid call window id." } },
      { status: 400 },
    );
  }
  const p = getPending(id);
  if (!p) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message:
            "That call window does not exist. Windows are short-lived and do not survive a server restart.",
        },
      },
      { status: 404 },
    );
  }
  return NextResponse.json({ pending: toPendingView(p) });
}
