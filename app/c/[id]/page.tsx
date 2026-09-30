import type { Metadata } from "next";
import { CallPanel } from "@/components/call-panel";

export const metadata: Metadata = {
  title: "Call window",
  description:
    "Call this coin before it launches and earn a share of its creator fees.",
};

export default async function CallWindowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-pixel text-2xl mb-2">
          <span className="text-green">&gt;</span> CALL WINDOW
        </h1>
        <p className="text-muted text-sm max-w-xl leading-relaxed">
          This coin does not exist yet. Call it now and, when the creator
          launches, your wallet is written into its on-chain fee split — you
          get paid on every trade, forever, by Pump.fun directly.
        </p>
      </div>
      <CallPanel id={id} />
    </div>
  );
}
