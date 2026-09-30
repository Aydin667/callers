"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import type {
  ApiError,
  PendingView,
  PrepareResponse,
  StatusResponse,
} from "@/lib/types";
import { fmtSol, shortAddr } from "@/lib/format";
import { WalletButton } from "./wallet-button";

type Phase =
  | { k: "idle" }
  | { k: "calling" }
  | { k: "preparing" }
  | { k: "review"; prep: PrepareResponse }
  | { k: "signing"; prep: PrepareResponse }
  | { k: "pending"; prep: PrepareResponse; bundleId: string }
  | { k: "landed"; prep: PrepareResponse; slot?: number; simulated?: boolean };

function useCountdown(closesAt: number) {
  const [left, setLeft] = useState(() => closesAt - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(closesAt - Date.now()), 1000);
    return () => clearInterval(t);
  }, [closesAt]);
  return left;
}

export function CallPanel({ id }: { id: string }) {
  const { publicKey, signMessage, signAllTransactions } = useWallet();
  const [p, setP] = useState<PendingView | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ k: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/pending/${id}`);
      const j = await r.json();
      if (j.error) setLoadErr(j.error.message);
      else setP(j.pending);
    } catch {
      setLoadErr("Could not reach the server.");
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const left = useCountdown(p?.closesAt ?? Date.now());

  const call = async () => {
    if (!publicKey || !signMessage) {
      setError("Connect a wallet that can sign messages.");
      return;
    }
    setError(null);
    setPhase({ k: "calling" });
    try {
      const msg = `Callers: I am calling launch ${id} as ${publicKey.toBase58()}`;
      const sig = await signMessage(new TextEncoder().encode(msg));
      const res = await fetch("/api/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingId: id,
          address: publicKey.toBase58(),
          signature: bs58.encode(sig),
        }),
      });
      const j = (await res.json()) as { pending: PendingView } | ApiError;
      if ("error" in j) setError(j.error.message);
      else setP(j.pending);
    } catch {
      setError("Signature rejected — you were not added.");
    } finally {
      setPhase({ k: "idle" });
    }
  };

  const prepare = async () => {
    if (!publicKey) return;
    setError(null);
    setPhase({ k: "preparing" });
    try {
      const res = await fetch("/api/launch/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId: id, creator: publicKey.toBase58() }),
      });
      const j = (await res.json()) as PrepareResponse | ApiError;
      if ("error" in j) {
        setError(j.error.message);
        setPhase({ k: "idle" });
        return;
      }
      setPhase({ k: "review", prep: j });
    } catch {
      setError("Network error while preparing. Nothing was created.");
      setPhase({ k: "idle" });
    }
  };

  const signAndSend = async (prep: PrepareResponse) => {
    if (!signAllTransactions) {
      setError("This wallet cannot sign multiple transactions.");
      return;
    }
    setError(null);
    setPhase({ k: "signing", prep });
    try {
      const txs = prep.transactionsToSign.map((b) =>
        VersionedTransaction.deserialize(
          Uint8Array.from(atob(b), (c) => c.charCodeAt(0)),
        ),
      );
      let signed: VersionedTransaction[];
      try {
        signed = await signAllTransactions(txs);
      } catch {
        setError("Signature rejected. Nothing was created.");
        setPhase({ k: "review", prep });
        return;
      }
      const res = await fetch("/api/launch/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: prep.sessionId,
          signedTxs: signed.map((t) =>
            btoa(String.fromCharCode(...t.serialize())),
          ),
        }),
      });
      const j = (await res.json()) as
        | { bundleId: string; state: string }
        | ApiError;
      if ("error" in j) {
        setError(j.error.message);
        setPhase({ k: "review", prep });
        return;
      }
      if (j.state === "simulated") {
        setPhase({ k: "landed", prep, simulated: true });
        return;
      }
      setPhase({ k: "pending", prep, bundleId: j.bundleId });
    } catch {
      setError("Submission failed — launches are all-or-nothing, nothing landed.");
      setPhase({ k: "review", prep });
    }
  };

  useEffect(() => {
    if (phase.k !== "pending") return;
    const started = Date.now();
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(
          `/api/launch/status?bundle=${encodeURIComponent(phase.bundleId)}`,
        );
        const j = (await r.json()) as StatusResponse;
        if (j.state === "landed") {
          clearInterval(pollRef.current!);
          setPhase({ k: "landed", prep: phase.prep, slot: j.slot });
        } else if (j.state === "failed" || Date.now() - started > 90_000) {
          clearInterval(pollRef.current!);
          setError("The bundle did not land. Nothing was created — you can retry.");
          setPhase({ k: "idle" });
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase]);

  if (loadErr) {
    return (
      <div className="border border-red/40 bg-surface rounded-sm p-8 font-mono text-sm text-red">
        {loadErr}
      </div>
    );
  }
  if (!p) {
    return (
      <div className="border border-line bg-surface rounded-sm p-8 font-mono text-sm text-muted">
        loading<span className="cursor-blink">▌</span>
      </div>
    );
  }

  const isCreator = publicKey?.toBase58() === p.creator;
  const alreadyCalled = p.callers.some((c) => c.address === publicKey?.toBase58());
  const full = p.callers.length >= p.maxCallers;
  const open = !p.closed && !p.launchedMint && !full;
  const mins = Math.max(0, Math.floor(left / 60000));
  const secs = Math.max(0, Math.floor((left % 60000) / 1000));

  if (phase.k === "landed") {
    const { prep } = phase;
    return (
      <div className="border border-green-dim bg-surface rounded-sm overflow-hidden rise">
        <div className="px-6 py-4 border-b border-green-dim bg-green-dim/20 flex items-center gap-3">
          <span className="font-pixel text-green seal-stamp inline-block">
            ✓ LAUNCHED
          </span>
          <span className="font-mono text-xs text-muted">
            {phase.simulated
              ? "dry-run simulation succeeded — no real coin was created"
              : `landed${phase.slot ? ` in slot ${phase.slot}` : ""}`}
          </span>
        </div>
        <div className="p-6 space-y-4">
          <div className="font-mono text-sm">
            <div className="text-[11px] uppercase tracking-wider text-muted mb-1">mint</div>
            <div className="text-text break-all">{prep.mint}</div>
          </div>
          <ShareTable shares={prep.shares} />
          <div className="grid sm:grid-cols-2 gap-3 font-mono text-sm">
            {!phase.simulated && (
              <a
                className="border border-line rounded-sm px-4 py-3 hover:border-green-dim transition-colors"
                href={`https://pump.fun/coin/${prep.mint}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                pump.fun page →
              </a>
            )}
            <Link
              className="border border-green-dim text-green rounded-sm px-4 py-3 hover:bg-green-dim/20 transition-colors"
              href={`/t/${prep.mint}`}
            >
              live certificate →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase.k === "review" || phase.k === "signing") {
    const prep = phase.prep;
    return (
      <div className="space-y-4 rise">
        <div className="border border-line bg-surface rounded-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
            review — exactly what you are signing
          </div>
          <div className="divide-y divide-line">
            {prep.manifest.map((m) => (
              <div key={m.index} className="px-5 py-4">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="font-pixel text-[10px] text-muted">TX {m.index}</span>
                  <span className="font-mono text-sm text-text">{m.label}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded-sm border ${
                      m.signer === "you"
                        ? "text-green border-green-dim"
                        : "text-muted border-line"
                    }`}
                  >
                    {m.signer === "you" ? "signed by you" : "signed by platform"}
                  </span>
                </div>
                <ul className="space-y-1">
                  {m.actions.map((a, i) => (
                    <li key={i} className="font-mono text-xs text-muted leading-relaxed">
                      <span className="text-green mr-1.5">·</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <ShareTable shares={prep.shares} />

        <div className="border border-line bg-surface rounded-sm p-5 font-mono text-sm space-y-1.5">
          <Row k="dev buy" v={fmtSol(prep.cost.devBuyLamports)} />
          <Row k="platform fee" v={fmtSol(prep.cost.platformFeeLamports)} />
          <Row k="jito tip" v={fmtSol(prep.cost.jitoTipLamports)} />
          <Row k="network rent + fees (est.)" v={`≈ ${fmtSol(prep.cost.estNetworkLamports)}`} />
          <div className="border-t border-line pt-1.5 mt-1.5">
            <Row k="total" v={`≈ ${fmtSol(prep.cost.totalLamports)}`} strong />
          </div>
          {prep.dryRun && (
            <div className="mt-3 border border-amber/40 rounded-sm px-3 py-2 text-xs text-amber">
              DRY-RUN MODE: simulated only; no coin created, no SOL moved.
            </div>
          )}
        </div>

        {error && <ErrorBox msg={error} />}

        <div className="flex items-center gap-3">
          <button
            onClick={() => signAndSend(prep)}
            disabled={phase.k === "signing"}
            className="font-mono text-sm bg-green text-bg font-medium px-6 py-2.5 rounded-sm hover:bg-green-hi transition-all disabled:opacity-50"
          >
            {phase.k === "signing" ? "waiting for wallet…" : "sign + launch"}
          </button>
          <button
            onClick={() => setPhase({ k: "idle" })}
            className="font-mono text-sm border border-line px-5 py-2.5 rounded-sm text-muted hover:text-text transition-colors"
          >
            back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="border border-line bg-surface rounded-sm overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-line">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.imageUri}
              alt=""
              className="w-12 h-12 rounded-sm border border-line object-cover bg-surface-2"
            />
            <div>
              <div className="font-mono text-base text-text">
                ${p.symbol}{" "}
                <span className="text-muted text-sm ml-1">{p.name}</span>
              </div>
              <div className="font-mono text-[11px] text-muted">
                by {shortAddr(p.creator)}
              </div>
            </div>
          </div>
          <div className="text-right">
            {p.launchedMint ? (
              <span className="font-pixel text-green">✓ LAUNCHED</span>
            ) : p.closed ? (
              <span className="font-pixel text-amber">WINDOW CLOSED</span>
            ) : (
              <>
                <div className="font-pixel text-xl text-green">
                  {mins}:{String(secs).padStart(2, "0")}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wide text-muted">
                  left to call
                </div>
              </>
            )}
          </div>
        </div>
        {p.description && (
          <div className="px-5 py-3 text-sm text-muted border-b border-line">
            {p.description}
          </div>
        )}
        <div className="px-5 py-3 font-mono text-xs text-muted">
          {p.callers.length}/{p.maxCallers} caller slots taken ·{" "}
          <span className="text-green">
            {(10000 - p.creatorKeepBps) / 100}% of creator fees
          </span>{" "}
          goes to callers, weighted by who called first
        </div>
      </div>

      {/* call action */}
      {!p.launchedMint && (
        <div className="border border-green-dim bg-surface rounded-sm p-5">
          {!publicKey ? (
            <div className="text-center">
              <p className="font-mono text-sm text-muted mb-4">
                connect a wallet to call this coin
              </p>
              <div className="flex justify-center">
                <WalletButton />
              </div>
            </div>
          ) : isCreator ? (
            <div className="space-y-4">
              <p className="font-mono text-xs text-muted leading-relaxed">
                this is your call window. you already hold the creator share —
                you can&apos;t call your own coin.
                {!p.closed && " wait for the window to close, then launch."}
              </p>
              <button
                onClick={prepare}
                disabled={phase.k === "preparing"}
                className="font-mono text-sm bg-green text-bg font-medium px-6 py-2.5 rounded-sm hover:bg-green-hi transition-all disabled:opacity-50"
              >
                {phase.k === "preparing"
                  ? "building…"
                  : p.closed
                    ? "launch now →"
                    : "launch early →"}
              </button>
            </div>
          ) : alreadyCalled ? (
            <p className="font-mono text-sm text-green">
              ✓ you called this one. your share goes into the split at
              launch.
            </p>
          ) : full ? (
            <p className="font-mono text-sm text-amber">
              all {p.maxCallers} caller slots are taken.
            </p>
          ) : !open ? (
            <p className="font-mono text-sm text-amber">
              the call window has closed.
            </p>
          ) : (
            <div className="space-y-3">
              <button
                onClick={call}
                disabled={phase.k === "calling"}
                className="font-mono text-base bg-green text-bg font-medium px-8 py-3 rounded-sm hover:bg-green-hi transition-all disabled:opacity-50"
              >
                {phase.k === "calling" ? "signing…" : "call it →"}
              </button>
              <p className="font-mono text-[11px] text-muted leading-relaxed">
                you&apos;ll sign a message (free, no transaction) proving you
                own this wallet. earlier callers earn a bigger slice.
              </p>
            </div>
          )}
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      {/* the split */}
      <ShareTable shares={p.projectedShares} live={!p.launchedMint} />

      {p.launchedMint && (
        <Link
          href={`/t/${p.launchedMint}`}
          className="inline-block font-mono text-sm border border-green-dim text-green px-5 py-2.5 rounded-sm hover:bg-green-dim/20 transition-colors"
        >
          view the live certificate →
        </Link>
      )}

      <p className="font-mono text-[11px] text-muted leading-relaxed">
        call windows live in server memory and do not survive a restart or
        deploy — that is why they max out at 60 minutes. once the coin launches,
        the split is written on-chain and is no longer our problem to remember.
      </p>
    </div>
  );
}

function ShareTable({
  shares,
  live,
}: {
  shares: { address: string; bps: number; role: string; rank?: number }[];
  live?: boolean;
}) {
  return (
    <div className="border border-line bg-surface rounded-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
        {live ? "the split, as it stands right now" : "the split written on-chain"}
      </div>
      <div className="divide-y divide-line">
        {shares.map((s) => (
          <div
            key={s.address}
            className="px-5 py-2.5 flex items-center justify-between gap-4 font-mono text-sm"
          >
            <span className="flex items-center gap-3 min-w-0">
              <span
                className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-sm border shrink-0 ${
                  s.role === "creator"
                    ? "text-muted border-line"
                    : "text-green border-green-dim"
                }`}
              >
                {s.role === "creator" ? "creator" : `caller #${s.rank}`}
              </span>
              <span className="text-text truncate">{shortAddr(s.address, 6)}</span>
            </span>
            <span className={s.role === "creator" ? "text-text" : "text-green"}>
              {(s.bps / 100).toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "text-text" : "text-muted"}>{k}</dt>
      <dd className={strong ? "text-green" : "text-text"}>{v}</dd>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="border border-red/40 bg-red/5 rounded-sm px-4 py-3 font-mono text-sm text-red rise">
      {msg}
    </div>
  );
}
