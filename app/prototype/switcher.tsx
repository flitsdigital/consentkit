"use client";
// PROTOTYPE — zwevende variant-wisselaar (← → of pijltjestoetsen). Niet in productie.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function Switcher({ variants, names }: { variants: string[]; names: Record<string, string> }) {
  const router = useRouter();
  const params = useSearchParams();
  const cur = params.get("variant") ?? variants[0];
  const go = (d: number) => {
    const i = (variants.indexOf(cur) + d + variants.length) % variants.length;
    const p = new URLSearchParams(params);
    if (variants[i] === "huidig") p.delete("variant"); else p.set("variant", variants[i]);
    router.replace(`?${p}`);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest?.("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent px-1.5 py-1 font-mono text-[12px] font-medium text-white shadow-lg">
      <button type="button" className="size-6 rounded-full hover:bg-white/20" onClick={() => go(-1)} aria-label="Vorige">←</button>
      <span className="px-2">{cur} — {names[cur]}</span>
      <button type="button" className="size-6 rounded-full hover:bg-white/20" onClick={() => go(1)} aria-label="Volgende">→</button>
    </div>
  );
}
