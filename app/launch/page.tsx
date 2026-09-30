import type { Metadata } from "next";
import { LaunchForm } from "@/components/launch-form";

export const metadata: Metadata = {
  title: "Launch",
  description:
    "Open a call window: let people call your coin before it exists and earn a share of its fees.",
};

export default function LaunchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <h1 className="font-pixel text-2xl mb-2">
          <span className="text-green">&gt;</span> OPEN A CALL WINDOW
        </h1>
        <p className="text-muted text-sm leading-relaxed max-w-xl">
          Set up the coin, then let people call it before it exists. The
          first callers are written into its Pump.fun fee split when you
          launch — paid directly by Pump.fun on every trade, forever.
        </p>
      </div>
      <LaunchForm />
    </div>
  );
}
