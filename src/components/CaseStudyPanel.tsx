import { useState } from "react";

import type { CaseStudy } from "@/lib/types";

type Tab = "overview" | "requirements" | "environment";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Visão Geral" },
  { key: "requirements", label: "Requisitos" },
  { key: "environment", label: "Ambiente" },
];

export function CaseStudyPanel({ caseStudy }: { caseStudy: CaseStudy }) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <aside className="w-full shrink-0 rounded-lg border border-border bg-surface-subtle p-5 lg:w-80">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
          Case Study
        </span>
      </div>
      <h2 className="text-sm font-bold leading-snug tracking-tight">{caseStudy.title}</h2>

      <div className="mt-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-2 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-[50vh] overflow-y-auto text-xs leading-relaxed text-muted-foreground">
        {tab === "overview" ? <p>{caseStudy.context}</p> : null}
        {tab === "requirements" ? (
          <ul className="space-y-2">
            {caseStudy.requirements.map((req, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-primary">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === "environment" ? <p>{caseStudy.environment}</p> : null}
      </div>
    </aside>
  );
}
