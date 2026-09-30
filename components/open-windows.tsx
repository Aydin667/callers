"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PendingView } from "@/lib/types";
import { shortAddr } from "@/lib/format";

function minsLeft(closesAt: number) {
  return Math.max(0, Math.round((closesAt - Date.now()) / 60000));
}

export function OpenWindows() {
  const [windows, setWindows] = useState<PendingView[] | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/pending")
        .then((r) => r.json())
        .then((d) => setWindows(d.pending ?? []))
        .catch(() => setWindows([]));
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (windows === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border border-line bg-surface rounded-sm p-5 h-28 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (windows.length === 0) {
    return (
      <div className="border border-line bg-surface rounded-sm p-8 text-center">
        <p className="font-mono text-sm text-muted mb-1">no open call windows</p>
        <p className="font-mono text-xs text-muted">
          when someone opens one it shows up here while the clock runs
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {windows.map((w) => (
        <Link
          key={w.id}
          href={`/c/${w.id}`}
          className="border border-green-dim bg-surface rounded-sm p-5 hover:bg-green-dim/10 transition-colors group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-sm text-text group-hover:text-green transition-colors">
              ${w.symbol}
            </span>
            <span className="font-mono text-[10px] text-green border border-green-dim rounded-sm px-1.5 py-0.5">
              {minsLeft(w.closesAt)}m left
            </span>
          </div>
          <div className="text-sm text-muted mb-3 truncate">{w.name}</div>
          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-muted">
            <div>
              <div className="text-[10px] uppercase tracking-wide">callers</div>
              <div className="text-text">
                {w.callers.length}/{w.maxCallers}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide">their cut</div>
              <div className="text-green">
                {(10000 - w.creatorKeepBps) / 100}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide">by</div>
              <div className="text-text">{shortAddr(w.creator, 3)}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
