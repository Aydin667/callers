import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Callers pays the people who called your coin: pre-launch call windows, Pump.fun fee sharing, and an on-chain record that makes tampering visible.",
};

const PROGRAMS = [
  {
    name: "Pump.fun",
    id: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    role: "Token creation (create_v2) and the bonding curve — your coin is a normal Pump.fun token.",
  },
  {
    name: "Pump.fun fee sharing",
    id: "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ",
    role: "create_fee_sharing_config + update_fee_shares_v2, shipped January 2026. This is what actually pays your callers — up to 10 shareholders, and Pump.fun distributes to them directly.",
  },
  {
    name: "Solana Attestation Service",
    id: "22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG",
    role: "Records the split as written at launch, so the verifier can detect if it is changed later.",
  },
];

export default function HowPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-12">
      <div>
        <h1 className="font-pixel text-2xl mb-3">
          <span className="text-green">&gt;</span> HOW IT WORKS
        </h1>
        <p className="text-muted leading-relaxed">
          Callers turns the people who shill your coin early into{" "}
          <span className="text-text">
            actual shareholders of its fee stream
          </span>{" "}
          — not because you picked them, but because they showed up first.
        </p>
      </div>

      <section>
        <h2 className="font-mono text-sm text-green mb-4">THE IDEA</h2>
        <div className="space-y-3 text-sm text-muted leading-relaxed">
          <p>
            Every memecoin depends on people calling it. They take the
            reputational risk of being early and loud, and they are paid in
            nothing but clout. Meanwhile the creator earns a fee on every
            single trade their calling generated.
          </p>
          <p>
            Other launchpads let a creator hand fee shares to whoever they
            like. That is patronage. Here a share is{" "}
            <em>earned permissionlessly</em>: you open a call window before the
            coin exists, and whoever calls it first — anyone, no invitation —
            is written into the coin&apos;s fee split when it launches.
          </p>
        </div>
      </section>

      <section>
        <h2 className="font-mono text-sm text-green mb-4">THE MECHANISM</h2>
        <div className="border border-line rounded-sm overflow-hidden font-mono text-sm">
          {[
            {
              t: "1 — the window",
              d: "The creator configures the coin and opens a call window (15, 30 or 60 minutes) along with the share callers will get. The coin does not exist yet — there is nothing to buy, only to call.",
            },
            {
              t: "2 — the call",
              d: "Anyone signs a message with their wallet: \"I am calling launch <id> as <address>\". It costs nothing and sends no transaction; the signature just proves they control that wallet. Order is recorded.",
            },
            {
              t: "3 — the weighting",
              d: "Callers split their portion with linear weights, so the first caller earns the largest slice and the ninth the smallest. Nine is the ceiling because Pump.fun allows ten fee shareholders and the creator takes one.",
            },
            {
              t: "4 — the launch",
              d: "create_v2 (plus an optional dev buy), then create_fee_sharing_config and update_fee_shares_v2 writing every caller in — all in one atomic Jito bundle. Same slot or nothing.",
            },
            {
              t: "5 — getting paid",
              d: "Nothing routes through us. Pump.fun's own fee distribution pays each shareholder their bps of the creator fee on every trade, on the curve and after graduation.",
            },
          ].map((s2) => (
            <div key={s2.t} className="border-b border-line last:border-0 px-5 py-4">
              <div className="text-text mb-1">{s2.t}</div>
              <p className="text-xs text-muted leading-relaxed">{s2.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-mono text-sm text-green mb-4">
          WHAT IS AND ISN&apos;T GUARANTEED
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-green-dim rounded-sm p-5">
            <div className="font-mono text-xs text-green mb-3">GUARANTEED</div>
            <ul className="space-y-2 text-sm text-muted">
              <li>· anyone can call — no invitation, first come first served</li>
              <li>· the split is written in the launch bundle, not later</li>
              <li>· Pump.fun pays callers directly; we never hold the money</li>
              <li>· the original split is recorded on-chain forever</li>
              <li>· any later change to it is detectable and shown publicly</li>
            </ul>
          </div>
          <div className="border border-amber/40 rounded-sm p-5">
            <div className="font-mono text-xs text-amber mb-3">
              NOT GUARANTEED
            </div>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                · <strong>permanence.</strong> Pump.fun lets the creator edit
                the fee config after launch. No launchpad can remove that
                power. We make abuse visible, not impossible
              </li>
              <li>
                · that the fees are worth anything — a share of nothing is
                nothing
              </li>
              <li>
                · that callers are strangers. a creator can call from their own
                alt wallets; every caller address is public, so look
              </li>
              <li>· the coin itself. this is not a safety mechanism</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-mono text-sm text-green mb-4">
          A LIMITATION WORTH KNOWING
        </h2>
        <p className="text-sm text-muted leading-relaxed">
          Call windows live in this server&apos;s memory, not on-chain. They do
          not survive a restart or a deploy, which is exactly why the longest
          window is one hour. Once a coin launches, everything that matters —
          the split and the record of it — is on-chain and no longer depends on
          us remembering anything.
        </p>
      </section>

      <section>
        <h2 className="font-mono text-sm text-green mb-4">
          PROGRAMS WE COMPOSE
        </h2>
        <p className="text-sm text-muted mb-4 leading-relaxed">
          Callers deploys no smart contract of its own. A launch composes
          programs Pump.fun and the Solana Foundation already run; our code
          only builds transactions you sign in your own wallet.
        </p>
        <div className="border border-line rounded-sm divide-y divide-line overflow-x-auto">
          {PROGRAMS.map((p) => (
            <div key={p.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 mb-1">
                <span className="font-mono text-sm text-text">{p.name}</span>
                <a
                  href={`https://solscan.io/account/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-muted hover:text-green break-all transition-colors"
                >
                  {p.id}
                </a>
              </div>
              <p className="font-mono text-xs text-muted leading-relaxed">
                {p.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-mono text-sm text-green mb-4">FOR BOTS + TERMINALS</h2>
        <p className="text-sm text-muted leading-relaxed mb-3">
          The verifier is a public API. Check whether a coin&apos;s callers are
          still being paid:
        </p>
        <pre className="border border-line bg-surface rounded-sm px-4 py-3 font-mono text-xs text-text overflow-x-auto">
{`GET https://callerslaunch.lol/api/verify/<mint>
GET https://callerslaunch.lol/api/launches`}
        </pre>
      </section>

      <div className="border-t border-line pt-8">
        <Link
          href="/launch"
          className="inline-block font-mono bg-green text-bg font-medium px-6 py-2.5 rounded-sm hover:bg-green-hi transition-colors"
        >
          Open a call window →
        </Link>
      </div>
    </div>
  );
}
