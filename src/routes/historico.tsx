import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Bar } from "@/components/Bar";
import { DOMAINS, MODE_LABEL, domainLabel } from "@/lib/domains";
import { formatDuration } from "@/lib/exam";
import { clearHistory, getHistory } from "@/lib/storage";
import type { DomainKey, ExamResult } from "@/lib/types";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico e progresso — AZ-104 Practice Exam" },
      {
        name: "description",
        content:
          "Acompanhe o progresso na preparação AZ-104: score por sessão, evolução por domínio, tempo total e média por questão.",
      },
      { property: "og:title", content: "Histórico e progresso — AZ-104 Practice Exam" },
      {
        property: "og:description",
        content: "Sessões registradas localmente com desempenho por domínio e tópico.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const [history, setHistory] = useState<ExamResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const aggregate = useMemo(() => {
    const map = new Map<DomainKey, { total: number; correct: number }>();
    let total = 0;
    let correct = 0;
    let seconds = 0;
    for (const run of history) {
      total += run.total;
      correct += run.correct;
      seconds += run.seconds;
      for (const domain of run.domains) {
        const entry = map.get(domain.domain) ?? { total: 0, correct: 0 };
        entry.total += domain.total;
        entry.correct += domain.correct;
        map.set(domain.domain, entry);
      }
    }
    return {
      total,
      correct,
      seconds,
      overall: total ? Math.round((correct / total) * 100) : 0,
      domains: DOMAINS.map((domain) => {
        const entry = map.get(domain.key);
        return {
          key: domain.key,
          label: domain.label,
          total: entry?.total ?? 0,
          percent: entry?.total ? Math.round((entry.correct / entry.total) * 100) : 0,
        };
      }),
    };
  }, [history]);

  return (
    <AppShell>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter">AZ-104 Progress</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {history.length} sessões · {aggregate.total} questões respondidas ·{" "}
            {formatDuration(aggregate.seconds)} de estudo registrado.
          </p>
        </div>
        {history.length ? (
          <button
            type="button"
            onClick={() => {
              clearHistory();
              setHistory([]);
            }}
            className="rounded border border-destructive/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive-soft"
          >
            Limpar histórico
          </button>
        ) : null}
      </div>

      {history.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma sessão registrada ainda. Faça um simulado ou o diagnóstico para começar a
            acompanhar seu progresso.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded bg-primary px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
          >
            Ir para o painel
          </Link>
        </div>
      ) : (
        <>
          <section className="card-surface p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="label-caps">Overall</span>
                <p className="font-mono text-4xl font-medium tracking-tighter">
                  {aggregate.overall}%
                </p>
              </div>
            </div>
            <div className="mt-8 space-y-4">
              {aggregate.domains.map((domain) => (
                <div key={domain.key}>
                  <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium">{domain.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {domain.total ? `${domain.percent}%` : "—"} · {domain.total} questões
                    </span>
                  </div>
                  <Bar percent={domain.total ? domain.percent : 0} className="h-2" />
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-bold tracking-tight">Sessões</h2>
            <div className="mt-4 space-y-3">
              {history.map((run) => (
                <div key={run.id} className="card-surface p-5">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === run.id ? null : run.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-4 text-left"
                  >
                    <span className="text-sm font-semibold">
                      {new Date(run.date).toLocaleString("pt-BR")}
                    </span>
                    <span className="label-caps">{MODE_LABEL[run.mode]}</span>
                    <span className="font-mono text-xs">{run.total} questões</span>
                    <span className="font-mono text-xs">
                      {run.correct}✓ / {run.incorrect}✗ / {run.unanswered}—
                    </span>
                    <span className="font-mono text-sm font-semibold">{run.percent}%</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDuration(run.seconds)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      {expanded === run.id ? "Ocultar" : "Detalhes"}
                    </span>
                  </button>

                  {expanded === run.id ? (
                    <div className="mt-5 grid gap-6 border-t border-border pt-5 lg:grid-cols-2">
                      <div>
                        <h3 className="label-caps">Desempenho por domínio</h3>
                        <div className="mt-3 space-y-3">
                          {run.domains.map((domain) => (
                            <div key={domain.domain}>
                              <div className="mb-1 flex justify-between text-xs">
                                <span>{domainLabel(domain.domain)}</span>
                                <span className="font-mono">
                                  {domain.percent}% ({domain.correct}/{domain.total})
                                </span>
                              </div>
                              <Bar percent={domain.percent} />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="label-caps">Desempenho por tópico</h3>
                        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-2">
                          {[...run.topics]
                            .sort((a, b) => a.percent - b.percent)
                            .map((topic) => (
                              <div
                                key={topic.topic}
                                className="flex items-center justify-between gap-3 text-xs"
                              >
                                <span className="flex-1">{topic.topic}</span>
                                <span className="font-mono">
                                  {topic.correct}/{topic.total}
                                </span>
                                <div className="w-16">
                                  <Bar percent={topic.percent} />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
