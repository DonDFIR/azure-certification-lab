import { useMemo } from "react";

import { Bar } from "@/components/Bar";
import { MODE_LABEL, domainLabel, domainShort } from "@/lib/domains";
import { formatDuration } from "@/lib/exam";
import type { ExamResult } from "@/lib/types";

export function ResultView({
  result,
  onReview,
  onRetry,
  onStudyErrors,
}: {
  result: ExamResult;
  onReview: () => void;
  onRetry: () => void;
  onStudyErrors: () => void;
}) {
  const ready = result.percent >= 75;
  const sortedDomains = useMemo(
    () => [...result.domains].sort((a, b) => b.percent - a.percent),
    [result.domains],
  );
  const weakTopics = useMemo(
    () =>
      [...result.topics]
        .filter((topic) => topic.percent < 100)
        .sort((a, b) => a.percent - b.percent || b.total - a.total)
        .slice(0, 6),
    [result.topics],
  );
  const strongest = sortedDomains[0];
  const weakest = sortedDomains[sortedDomains.length - 1];

  return (
    <div className="space-y-8">
      <section className="card-surface p-6 sm:p-10">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-8">
          <div className="min-w-[200px]">
            <span
              className={`mb-4 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
                ready ? "bg-success-soft text-success" : "bg-warning-soft text-warning-foreground"
              }`}
            >
              {ready ? "Ready" : "Needs Review"}
            </span>
            <h1 className="text-4xl font-extrabold tracking-tighter">
              Resultado: {result.percent}%
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {MODE_LABEL[result.mode]} finalizado em{" "}
              {new Date(result.date).toLocaleString("pt-BR")} · tempo total{" "}
              {formatDuration(result.seconds)} · média {result.avgSeconds}s por questão.
            </p>
            <p className="mt-2 max-w-[60ch] text-xs text-muted-foreground">
              Um único simulado não determina aprovação no exame real. Use o resultado para
              direcionar a revisão.
            </p>
          </div>
          <div className="flex flex-wrap gap-10">
            <Stat label="Corretas" value={result.correct} />
            <Stat label="Incorretas" value={result.incorrect} tone="text-destructive" />
            <Stat label="Em branco" value={result.unanswered} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="label-caps pb-4 pl-0">Domínio</th>
                <th className="label-caps px-4 pb-4">Score</th>
                <th className="label-caps px-4 pb-4">Desempenho</th>
                <th className="label-caps pb-4 pr-0 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {sortedDomains.map((domain) => (
                <tr key={domain.domain} className="border-b border-border">
                  <td className="py-4 pl-0 font-medium">{domainLabel(domain.domain)}</td>
                  <td className="px-4 py-4 font-mono">
                    {domain.percent}%{" "}
                    <span className="text-muted-foreground">
                      ({domain.correct}/{domain.total})
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="w-32">
                      <Bar percent={domain.percent} className="h-2" />
                    </div>
                  </td>
                  <td className="py-4 pr-0 text-right text-[10px] font-bold uppercase">
                    {domain.percent >= 80
                      ? "Excelente"
                      : domain.percent >= 70
                        ? "Adequado"
                        : "Revisar"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReview}
            className="flex-1 rounded border border-border py-4 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-surface-subtle"
          >
            Revisar questões e explicações
          </button>
          <button
            type="button"
            onClick={onStudyErrors}
            disabled={result.wrongIds.length === 0}
            className="flex-1 rounded border border-border py-4 text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-surface-subtle disabled:opacity-40"
          >
            Estudar somente os erros
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 rounded bg-primary py-4 text-[10px] font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest">Diagnóstico</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Domínio mais forte</dt>
              <dd className="font-semibold">
                {strongest ? `${domainShort(strongest.domain)} — ${strongest.percent}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Domínio mais fraco</dt>
              <dd className="font-semibold">
                {weakest ? `${domainShort(weakest.domain)} — ${weakest.percent}%` : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            Recomendação: dedique as próximas sessões ao domínio{" "}
            <strong className="text-foreground">
              {weakest ? domainLabel(weakest.domain) : "—"}
            </strong>{" "}
            usando o Modo Domínio, revise as explicações das questões erradas e repita um simulado
            completo em seguida.
          </p>
        </div>

        <div className="card-surface p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest">Tópicos críticos</h2>
          {weakTopics.length ? (
            <ol className="mt-4 space-y-3">
              {weakTopics.map((topic, index) => (
                <li key={topic.topic} className="flex items-center gap-4">
                  <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
                  <span className="flex-1 text-sm font-medium">{topic.topic}</span>
                  <span className="font-mono text-xs">
                    {topic.correct}/{topic.total}
                  </span>
                  <div className="w-16">
                    <Bar percent={topic.percent} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Nenhum tópico com erros nesta sessão.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="text-center">
      <span className={`block font-mono text-2xl font-medium tracking-tight ${tone}`}>{value}</span>
      <span className="label-caps">{label}</span>
    </div>
  );
}
