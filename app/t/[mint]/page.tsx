import type { Metadata } from "next";
import { VerifyPanel } from "@/components/verify-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mint: string }>;
}): Promise<Metadata> {
  const { mint } = await params;
  const short = `${mint.slice(0, 4)}…${mint.slice(-4)}`;
  return {
    title: `Split ${short}`,
    description: `Live check of the caller fee split for ${mint}: what was promised at launch versus what is live on-chain right now.`,
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-pixel text-2xl mb-2">
          <span className="text-green">&gt;</span> THE SPLIT
        </h1>
        <p className="text-muted text-sm max-w-xl leading-relaxed">
          Every claim below is re-checked against the chain when you load this
          page. The split recorded at launch is compared against the live
          fee-sharing config, so a creator who cuts their callers out cannot
          do it quietly.
        </p>
      </div>
      <VerifyPanel mint={mint} />
    </div>
  );
}
