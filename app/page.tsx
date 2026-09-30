import Link from "next/link";
import Image from "next/image";
import { SealDemo } from "@/components/seal-demo";
import { RecentLaunches } from "@/components/recent-launches";
import { OpenWindows } from "@/components/open-windows";

export default function Home() {
  return (
    <div>
      {/* hero */}
      <section className="scanlines border-b border-line">
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className="flex flex-col items-start gap-6 max-w-3xl">
            <div className="flex items-center gap-2 font-mono text-xs text-muted border border-line rounded-sm px-3 py-1.5">
              <span className="text-green pulse-dot">●</span>
              real pump.fun tokens · real curve · real graduation
            </div>
            <h1 className="font-pixel text-3xl sm:text-5xl leading-tight">
              THE PEOPLE WHO
              <br />
              CALLED IT <span className="text-green">GET PAID</span>
              <span className="text-green cursor-blink">▌</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted leading-relaxed max-w-2xl">
              Open a call window before your coin exists. Whoever calls it
              first gets{" "}
              <span className="text-text">
                written into the coin&apos;s on-chain fee split
              </span>{" "}
              — and Pump.fun pays them directly on every trade from then on.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/launch"
                className="font-mono text-base bg-green text-bg font-medium px-6 py-2.5 rounded-sm hover:bg-green-hi active:translate-y-px transition-all"
              >
                Open a window →
              </Link>
              <Link
                href="/how"
                className="font-mono text-base border border-line text-text px-6 py-2.5 rounded-sm hover:border-green-dim hover:bg-surface transition-all"
              >
                How it works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* demo */}
      <section className="mx-auto max-w-6xl px-4 -mt-8 relative z-10">
        <SealDemo />
      </section>

      {/* open windows */}
      <section className="mx-auto max-w-6xl px-4 mt-20">
        <h2 className="font-mono text-sm text-muted mb-6">
          <span className="text-green">&gt;</span> WINDOWS OPEN RIGHT NOW
        </h2>
        <OpenWindows />
      </section>

      {/* the idea */}
      <section className="mx-auto max-w-6xl px-4 mt-20">
        <div className="grid gap-px sm:grid-cols-3 bg-line border border-line rounded-sm overflow-hidden">
          {[
            {
              n: "earned",
              t: "shares aren't handed out by the dev — you get one by calling the coin before it exists, first come first served",
              s: "permissionless",
            },
            {
              n: "9",
              t: "caller slots per coin. Pump.fun's fee sharing allows 10 shareholders and the creator takes one",
              s: "a hard protocol limit, not our choice",
            },
            {
              n: "0%",
              t: "of it flows through us. the split is Pump.fun's own fee-sharing config — they pay your callers directly",
              s: "we never custody the money",
            },
          ].map((c) => (
            <div key={c.s} className="bg-surface p-6">
              <div className="font-pixel text-2xl text-green mb-2">{c.n}</div>
              <div className="text-sm text-text leading-relaxed">{c.t}</div>
              <div className="font-mono text-[11px] text-muted mt-3">{c.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-4 mt-20">
        <h2 className="font-mono text-sm text-muted mb-6">
          <span className="text-green">&gt;</span> HOW IT WORKS
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              k: "01",
              t: "Open a window",
              d: "Set up the coin as usual, pick how long people can call it (up to an hour) and how much of your creator fees they share. You get a link.",
            },
            {
              k: "02",
              t: "People call it",
              d: "Anyone signs a message with their wallet to call the coin — free, no transaction. The earlier they call, the bigger their slice.",
            },
            {
              k: "03",
              t: "Launch pays them in",
              d: "When you launch, the coin is created and the fee split is written on-chain in the same atomic bundle. Pump.fun pays your callers on every trade from then on.",
            },
          ].map((s) => (
            <div key={s.k} className="border border-line bg-surface rounded-sm p-6">
              <div className="font-pixel text-xs text-green mb-4">{s.k}</div>
              <div className="font-medium text-lg mb-2">{s.t}</div>
              <p className="text-sm text-muted leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* recent */}
      <section className="mx-auto max-w-6xl px-4 mt-20">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-mono text-sm text-muted">
            <span className="text-green">&gt;</span> LAUNCHED WITH CALLERS PAID
          </h2>
          <Link
            href="/launches"
            className="font-mono text-xs text-muted hover:text-green transition-colors"
          >
            view all →
          </Link>
        </div>
        <RecentLaunches limit={6} />
      </section>

      {/* under the hood */}
      <section className="mx-auto max-w-6xl px-4 mt-20">
        <div className="border border-line rounded-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-line bg-surface">
            <h2 className="font-mono text-sm text-muted">
              <span className="text-green">&gt;</span> UNDER THE HOOD
            </h2>
          </div>
          <div className="grid gap-px sm:grid-cols-2 bg-line">
            {[
              {
                t: "Pump.fun's own fee sharing",
                d: "We use create_fee_sharing_config + update_fee_shares_v2, shipped by Pump.fun in January 2026. Your callers become real shareholders of the coin's creator-fee stream.",
              },
              {
                t: "Written in the launch bundle",
                d: "Creation, the dev buy, and the split all land in one atomic Jito bundle — same slot or nothing. Nobody can trade before the callers are in.",
              },
              {
                t: "A call is a signature",
                d: "Calling costs nothing and sends no transaction: you sign a message, which proves you control the wallet. That wallet is what gets paid.",
              },
              {
                t: "Tampering is detectable",
                d: "The split is recorded in an on-chain certificate at launch. GET /api/verify/<mint> compares it to the live config forever after.",
              },
            ].map((c) => (
              <div key={c.t} className="bg-bg p-6">
                <div className="font-mono text-sm text-green mb-2">{c.t}</div>
                <p className="text-sm text-muted leading-relaxed">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 border border-amber/30 bg-amber/5 rounded-sm px-5 py-4">
          <p className="font-mono text-xs text-amber leading-relaxed">
            READ THIS BEFORE YOU CALL: Pump.fun lets a coin&apos;s creator edit
            their fee-sharing config after launch, and no launchpad — including
            this one — can take that power away. A creator can cut their
            callers out later. We cannot stop it; what we do is record the
            original split on-chain and flag any change loudly on the coin&apos;s
            page. Also: callers earn a share of <em>fees</em>, which is worth
            nothing if the coin never trades, and a creator can call their own
            coin from other wallets. Callers are public — judge them yourself.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 mt-20">
        <div className="dotgrid border border-line rounded-sm px-6 py-14 text-center">
          <Image
            src="/favicon-32.png"
            alt=""
            width={40}
            height={40}
            className="pixelated mx-auto mb-5"
          />
          <h2 className="font-pixel text-xl sm:text-2xl mb-3">
            PAY THE PEOPLE WHO SHOW UP
          </h2>
          <p className="text-muted mb-6 max-w-md mx-auto">
            Your callers are the reason anyone hears about it. Give them a
            reason to be early.
          </p>
          <Link
            href="/launch"
            className="inline-block font-mono bg-green text-bg font-medium px-8 py-3 rounded-sm hover:bg-green-hi active:translate-y-px transition-all"
          >
            Open a window →
          </Link>
        </div>
      </section>
    </div>
  );
}
