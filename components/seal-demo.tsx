"use client";

/**
 * Interactive demo: callers pile into a window, and the fee split rebalances
 * live as each one arrives — earlier callers keep the bigger slice.
 */
import { useCallback, useEffect, useRef, useState } from "react";

const NAMES = ["7xKq…4Nmp", "Bv2R…9tLd", "Ge8W…1cQs", "Hn4Z…6vYk", "3Jd9…KpXa"];
const CREATOR_KEEP = 5000;

function splitCallerShares(callerBps: number, k: number): number[] {
  if (k <= 0) return [];
  const weights = Array.from({ length: k }, (_, i) => k - i);
  const totalW = weights.reduce((a, b) => a + b, 0);
  const out = weights.map((w) => Math.max(1, Math.floor((callerBps * w) / totalW)));
  const diff = callerBps - out.reduce((a, b) => a + b, 0);
  if (diff > 0) out[0] += diff;
  return out;
}

export function SealDemo() {
  const [n, setN] = useState(NAMES.length);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRunning(true);
    setN(0);
    NAMES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setN(i + 1), 500 + i * 650));
    });
    timers.current.push(
      setTimeout(() => setRunning(false), 500 + NAMES.length * 650),
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(run, 600);
    return () => {
      clearTimeout(t);
      timers.current.forEach(clearTimeout);
    };
  }, [run]);

  const shares = splitCallerShares(10000 - CREATOR_KEEP, n);

  return (
    <div className="border border-line bg-surface rounded-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-line">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
          a call window filling up · 50% of creator fees to callers
        </span>
        <button
          onClick={run}
          disabled={running}
          className="font-mono text-xs text-green hover:text-green-hi disabled:opacity-40 transition-colors"
        >
          {running ? "calling…" : "replay ↻"}
        </button>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 border border-line rounded-sm bg-surface-2 font-mono text-xs">
          <span className="flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-wide text-muted border border-line rounded-sm px-1.5 py-0.5">
              creator
            </span>
            <span className="text-text">the dev</span>
          </span>
          <span className="text-text">50.00%</span>
        </div>

        {NAMES.map((name, i) => {
          const active = i < n;
          return (
            <div
              key={name}
              className={`flex items-center justify-between px-3 py-2 border rounded-sm font-mono text-xs transition-all duration-300 ${
                active
                  ? "border-green-dim bg-green-dim/15 opacity-100"
                  : "border-line opacity-30"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`text-[10px] uppercase tracking-wide border rounded-sm px-1.5 py-0.5 ${
                    active ? "text-green border-green-dim" : "text-muted border-line"
                  }`}
                >
                  caller #{i + 1}
                </span>
                <span className={active ? "text-text" : "text-muted"}>{name}</span>
              </span>
              <span className={active ? "text-green" : "text-muted"}>
                {active ? `${(shares[i] / 100).toFixed(2)}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 pb-4">
        <div
          className={`border rounded-sm px-4 py-3 flex flex-wrap items-center justify-between gap-2 transition-colors ${
            !running && n > 0 ? "border-green bg-green-dim/20" : "border-line"
          }`}
        >
          <span className="font-mono text-sm">
            {!running && n > 0 ? (
              <span className="text-green seal-stamp inline-block">
                ◆ {n} callers written into the coin&apos;s fee split at launch
              </span>
            ) : (
              <span className="text-muted">
                window open<span className="cursor-blink">▌</span>
              </span>
            )}
          </span>
          <span className="font-mono text-[11px] text-muted">
            earlier = bigger slice
          </span>
        </div>
      </div>
    </div>
  );
}
