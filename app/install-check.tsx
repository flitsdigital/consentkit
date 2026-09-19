"use client";
// Installatie-check: haalt /api/check op en toont de checklist. Gebruikt in de Studio (Installatie → Controleren) en op /sites.
import { useState } from "react";
import type { CheckResult } from "../lib/check";

const MARK = { ok: ["✓", "bg-emerald-400/15 text-emerald-300"], warn: ["!", "bg-amber-400/15 text-amber-300"], fail: ["✕", "bg-red-400/15 text-red-300"] } as const;

export function InstallCheck({ url, siteKey, privacy }: { url: string; siteKey?: string; privacy?: string }) {
  const [state, setState] = useState<{ loading?: boolean; error?: string; result?: CheckResult }>({});
  const run = async () => {
    setState({ loading: true });
    const q = new URLSearchParams({ url, ...(siteKey && { key: siteKey }), ...(privacy && { privacy }) });
    const res = await fetch(`/api/check?${q}`);
    const json = await res.json();
    setState(res.ok ? { result: json } : { error: json.error });
  };
  const r = state.result;
  const fails = r?.items.filter((i) => i.state === "fail").length ?? 0;
  const warns = r?.items.filter((i) => i.state === "warn").length ?? 0;
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className="btn w-full" disabled={!url || state.loading} onClick={run}>{state.loading ? "Controleren…" : r ? "Opnieuw controleren" : "Controleer installatie"}</button>
      {state.error && <p className="text-[11px] text-red-300">{state.error}</p>}
      {r && (
        <>
          <p className="text-[11px] text-muted">{fails ? `${fails} probleem${fails > 1 ? "en" : ""}` : warns ? `Werkt, ${warns} aandachtspunt${warns > 1 ? "en" : ""}` : "Alles in orde"} · {new Date(r.checkedAt).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</p>
          <ul className="flex flex-col gap-1">
            {r.items.map((i) => (
              <li key={i.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5" style={{ boxShadow: "var(--shadow-ring)" }}>
                <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${MARK[i.state][1]}`}>{MARK[i.state][0]}</span>
                <span className="min-w-0"><span className="block text-[12px]">{i.label}</span><span className="block truncate text-[11px] text-muted" title={i.detail}>{i.detail}</span></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
