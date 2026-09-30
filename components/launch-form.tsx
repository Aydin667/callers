"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  CALL_WINDOWS,
  CREATOR_KEEP_OPTIONS,
  MAX_CALLERS,
  MAX_DEV_BUY_SOL,
} from "@/lib/config";
import type { ApiError, PendingView } from "@/lib/types";
import { WalletButton } from "./wallet-button";

interface FormState {
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  devBuySol: string;
  creatorKeepBps: number;
  windowId: string;
}

const initialForm: FormState = {
  name: "",
  symbol: "",
  description: "",
  website: "",
  twitter: "",
  telegram: "",
  devBuySol: "0",
  creatorKeepBps: 5000,
  windowId: "m30",
};

export function LaunchForm() {
  const { publicKey } = useWallet();
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const onImage = useCallback((file: File | null) => {
    setImage(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
  }, []);

  const submit = async () => {
    if (!publicKey) return setError("Connect a wallet first.");
    if (!form.name.trim()) return setError("Token name is required.");
    if (!/^[A-Za-z0-9]{1,10}$/.test(form.symbol.trim()))
      return setError("Ticker: 1–10 letters/numbers.");
    if (!image) return setError("Token image is required.");
    const buy = Number(form.devBuySol || "0");
    if (!(buy >= 0 && buy <= MAX_DEV_BUY_SOL))
      return setError(`Dev buy must be between 0 and ${MAX_DEV_BUY_SOL} SOL.`);
    for (const [label, v] of [
      ["Website", form.website],
      ["X link", form.twitter],
      ["Telegram", form.telegram],
    ] as const) {
      if (v && !/^https:\/\/.+/.test(v.trim()))
        return setError(`${label} must be an https:// URL.`);
    }

    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("name", form.name.trim());
      fd.set("symbol", form.symbol.trim().toUpperCase());
      fd.set("description", form.description.trim());
      fd.set("website", form.website.trim());
      fd.set("twitter", form.twitter.trim());
      fd.set("telegram", form.telegram.trim());
      fd.set("devBuySol", String(buy));
      fd.set("creatorKeepBps", String(form.creatorKeepBps));
      fd.set("windowId", form.windowId);
      fd.set("creator", publicKey.toBase58());
      fd.set("image", image);
      const res = await fetch("/api/pending", { method: "POST", body: fd });
      const json = (await res.json()) as { pending: PendingView } | ApiError;
      if ("error" in json) {
        setError(json.error.message);
        setBusy(false);
        return;
      }
      router.push(`/c/${json.pending.id}`);
    } catch {
      setError("Network error — nothing was created. Try again.");
      setBusy(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="border border-line bg-surface rounded-sm p-10 text-center">
        <p className="font-mono text-sm text-muted mb-5">
          connect a wallet to open a call window
        </p>
        <div className="flex justify-center">
          <WalletButton />
        </div>
      </div>
    );
  }

  const callerPct = (10000 - form.creatorKeepBps) / 100;

  return (
    <div className="space-y-6">
      <div className="border border-line bg-surface rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-line font-mono text-[11px] uppercase tracking-wider text-muted">
          the coin
        </div>
        <div className="p-5 grid gap-4 sm:grid-cols-2">
          <Field label="name" hint="max 32 chars">
            <input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              maxLength={32}
              placeholder="My Coin"
              className={inputCls}
            />
          </Field>
          <Field label="ticker" hint="1–10 letters/numbers">
            <input
              value={form.symbol}
              onChange={(e) =>
                set({ symbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
              }
              maxLength={10}
              placeholder="COIN"
              className={inputCls}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="description" hint="optional, max 600 chars">
              <textarea
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                maxLength={600}
                rows={3}
                placeholder="what is this?"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="image" hint="png / jpg / gif / webp, max 4.3 MB">
              <div className="flex items-center gap-4">
                <label className="cursor-pointer border border-dashed border-line rounded-sm px-4 py-3 font-mono text-xs text-muted hover:border-green-dim hover:text-text transition-colors">
                  {image ? image.name : "choose file…"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => onImage(e.target.files?.[0] ?? null)}
                  />
                </label>
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="preview"
                    className="w-14 h-14 rounded-sm object-cover border border-line"
                  />
                )}
              </div>
            </Field>
          </div>
        </div>
      </div>

      <div className="border border-green-dim bg-surface rounded-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-green-dim bg-green-dim/10 font-mono text-[11px] uppercase tracking-wider text-green">
          the call window
        </div>
        <div className="p-5 space-y-5">
          <div>
            <div className="font-mono text-xs text-muted mb-2">
              how long can people call it before you launch?
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {CALL_WINDOWS.map((w) => (
                <button
                  key={w.id}
                  onClick={() => set({ windowId: w.id })}
                  className={`text-left border rounded-sm px-3 py-2.5 transition-colors ${
                    form.windowId === w.id
                      ? "border-green bg-green-dim/20"
                      : "border-line hover:border-green-dim"
                  }`}
                >
                  <div
                    className={`font-mono text-sm ${form.windowId === w.id ? "text-green" : "text-text"}`}
                  >
                    {w.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-xs text-muted mb-2">
              split of your creator fees — you / callers
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              {CREATOR_KEEP_OPTIONS.map((o) => (
                <button
                  key={o.bps}
                  onClick={() => set({ creatorKeepBps: o.bps })}
                  className={`text-left border rounded-sm px-3 py-2.5 transition-colors ${
                    form.creatorKeepBps === o.bps
                      ? "border-green bg-green-dim/20"
                      : "border-line hover:border-green-dim"
                  }`}
                >
                  <div
                    className={`font-mono text-sm ${form.creatorKeepBps === o.bps ? "text-green" : "text-text"}`}
                  >
                    {o.label}
                  </div>
                  <div className="font-mono text-[11px] text-muted mt-0.5">
                    {o.blurb}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Field
            label="dev buy (SOL)"
            hint={`0–${MAX_DEV_BUY_SOL} SOL — optional, 0 means you take no allocation`}
          >
            <input
              value={form.devBuySol}
              onChange={(e) =>
                set({ devBuySol: e.target.value.replace(/[^0-9.]/g, "") })
              }
              inputMode="decimal"
              className={`${inputCls} max-w-40`}
            />
          </Field>

          <div className="font-mono text-xs text-muted border-t border-line pt-4 leading-relaxed">
            you&apos;ll get a link to share. the first{" "}
            <span className="text-text">{MAX_CALLERS}</span> wallets that call it
            split <span className="text-green">{callerPct}%</span> of this
            coin&apos;s Pump.fun creator fees, weighted so the earliest caller
            earns the most. when the window closes you come back and launch —
            the split is written on-chain in the same bundle that creates the
            coin.
          </div>
        </div>
      </div>

      <div className="border border-line bg-surface rounded-sm overflow-hidden">
        <button
          onClick={() => setAdvanced((v) => !v)}
          className="w-full px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted text-left hover:text-text transition-colors"
        >
          {advanced ? "▾" : "▸"} socials (optional)
        </button>
        {advanced && (
          <div className="p-5 pt-0 grid gap-4 sm:grid-cols-3 rise">
            <Field label="website">
              <input value={form.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://…" className={inputCls} />
            </Field>
            <Field label="x / twitter">
              <input value={form.twitter} onChange={(e) => set({ twitter: e.target.value })} placeholder="https://x.com/…" className={inputCls} />
            </Field>
            <Field label="telegram">
              <input value={form.telegram} onChange={(e) => set({ telegram: e.target.value })} placeholder="https://t.me/…" className={inputCls} />
            </Field>
          </div>
        )}
      </div>

      {error && (
        <div className="border border-red/40 bg-red/5 rounded-sm px-4 py-3 font-mono text-sm text-red rise">
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy}
        className="font-mono text-base bg-green text-bg font-medium px-8 py-3 rounded-sm hover:bg-green-hi active:translate-y-px transition-all disabled:opacity-50"
      >
        {busy ? "opening…" : "open call window →"}
      </button>
    </div>
  );
}

const inputCls =
  "w-full bg-surface-2 border border-line rounded-sm px-3 py-2 font-mono text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-green-dim transition-colors";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="font-mono text-xs text-text">{label}</span>
        {hint && <span className="font-mono text-[10px] text-muted">{hint}</span>}
      </div>
      {children}
    </label>
  );
}
