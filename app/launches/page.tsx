import type { Metadata } from "next";
import { RecentLaunches } from "@/components/recent-launches";

export const metadata: Metadata = {
  title: "Launches",
  description: "Every coin launched here with its callers paid in, read from the chain.",
};

export default function LaunchesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-pixel text-2xl mb-2">
          <span className="text-green">&gt;</span> LAUNCHES
        </h1>
        <p className="text-muted text-sm max-w-xl leading-relaxed">
          This list is not a database — it is enumerated live from the
          on-chain launch certificates under Callers&apos;s attestation
          credential. If it&apos;s here, it&apos;s provable.
        </p>
      </div>
      <RecentLaunches limit={50} />
    </div>
  );
}
