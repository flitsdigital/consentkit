"use client";
// PROTOTYPE — drie account-shells (login → sites → account) op één route, ?variant=A|B|C en ?screen=…
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Switcher } from "../switcher";
import { VariantA, VariantB, VariantC, type Screen } from "./variants";

const NAMES = { A: "Werkruimte", B: "Zijbalk", C: "In de Studio" };
const VARIANTS = { A: VariantA, B: VariantB, C: VariantC };

function Page() {
  const router = useRouter();
  const params = useSearchParams();
  const v = (params.get("variant") ?? "A") as keyof typeof VARIANTS;
  const screen = (params.get("screen") ?? "login") as Screen;
  const go = (s: Screen) => { const p = new URLSearchParams(params); p.set("screen", s); router.replace(`?${p}`); };
  const V = VARIANTS[v] ?? VariantA;
  return (
    <div className="h-dvh">
      <V screen={screen} go={go} />
      <Switcher variants={Object.keys(VARIANTS)} names={NAMES} />
    </div>
  );
}
export default function Prototype() { return <Suspense><Page /></Suspense>; }
