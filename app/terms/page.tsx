import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-6 text-sm text-muted leading-relaxed">
      <h1 className="font-pixel text-2xl text-text">
        <span className="text-green">&gt;</span> TERMS OF USE
      </h1>
      <p className="font-mono text-xs">Last updated: September 29, 2026</p>
      <p>
        Callers (&ldquo;the service&rdquo;) is a non-custodial interface that
        builds Solana transactions which you review and sign in your own
        wallet. By using the service you agree to these terms.
      </p>
      <h2 className="font-mono text-text">1. What the service does</h2>
      <p>
        The service composes transactions against third-party on-chain
        programs (Pump.fun, including its creator fee sharing, and the Solana
        Attestation Service). Callers never takes custody of your funds or
        tokens and never holds your private keys. Fee payouts are made by
        Pump.fun directly to each shareholder; the service is not in the money
        path and cannot pay, withhold, or claw back anyone&apos;s share.
      </p>
      <h2 className="font-mono text-text">2. No financial advice, no guarantees of value</h2>
      <p>
        Tokens launched through the service are memecoins with no intrinsic
        value. Calling a coin earns a share of that coin&apos;s creator{" "}
        <em>fees</em>, which is worth nothing if the coin never trades. A call
        is not a purchase, an investment, a security, or a claim on token
        supply, and no return of any kind is promised or implied. You can lose
        everything you spend. Nothing here is investment advice.
      </p>
      <h2 className="font-mono text-text">3. The split can be changed by the creator</h2>
      <p>
        Pump.fun allows a coin&apos;s creator to edit its fee-sharing
        configuration after launch. The service cannot prevent this and does
        not control it. A creator may reduce or remove a caller&apos;s share at
        any time. What the service does is record the split as written at
        launch and publicly compare it against the live configuration. Callers
        accept this risk by calling. The service also cannot verify identity,
        prevent a creator from calling their own coin using other wallets, or
        prevent market manipulation.
      </p>
      <h2 className="font-mono text-text">4. Fees and irreversibility</h2>
      <p>
        The service charges a flat platform fee displayed before you sign.
        Calling is free and sends no transaction. Solana transactions are
        irreversible, and a launch, once made, cannot be undone by the service.
      </p>
      <h2 className="font-mono text-text">5. Eligibility and compliance</h2>
      <p>
        You are responsible for compliance with the laws of your jurisdiction,
        including any restrictions on the use of digital assets. The service
        is provided &ldquo;as is&rdquo; without warranties; to the maximum
        extent permitted by law, Callers&apos;s liability is limited to the
        platform fees you paid in the 30 days before a claim.
      </p>
      <h2 className="font-mono text-text">6. Third-party programs</h2>
      <p>
        Pump.fun and the Solana Attestation Service are independent programs
        not operated by Callers. Their behavior may
        change; on-chain risk (including program bugs) is inherent to using
        Solana.
      </p>
      <h2 className="font-mono text-text">7. Contact</h2>
      <p>
        Questions: reach us on X{" "}
        <a
          href="https://x.com/callerslol"
          className="text-green hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          @callerslol
        </a>
        .
      </p>
    </div>
  );
}
