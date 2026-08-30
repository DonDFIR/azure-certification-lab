import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Bar, NeutralBar } from "@/components/Bar";
import { ALL_DIFFICULTIES, DIFFICULTY_LABEL, DOMAINS, MODE_LABEL } from "@/lib/domains";
import { formatDuration } from "@/lib/exam";
import { useBank } from "@/lib/questions";
import { getHistory, getWrong } from "@/lib/storage";
import type { Difficulty, DomainKey, ExamMode, ExamResult } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AZ-104 Practice Exam — Simulados e treino para Azure Administrator" },
      {
        name: "description",
        content:
          "Portal local de simulados AZ-104 com questões originais em português, modos de prova, treino, diagnóstico e acompanhamento de desempenho por domínio.",
      },
      { property: "og:title", content: "AZ-104 Practice Exam — Portal de simulados" },
      {
        property: "og:description",
        content:
          "Pratique para a certificação Microsoft Azure Administrator AZ-104 com simulados cronometrados, modo treino e diagnóstico de lacunas.",
      },
    ],
  }),
  component: Dashboard,
});

const COUNT_OPTIONS: Record<ExamMode, number[]> = {
  simulado: [20, 40, 60, 100],
  treino: [10, 20, 40, 60],
  dominio: [10, 20, 40, 60],
  erros: [10, 20, 40],
  diagnostico: [25],
  // "sandbox" tem sua própria tela de configuração em /exam-sandbox e não usa ModeConfig;
  // mantido aqui apenas para satisfazer o Record<ExamMode, ...> exaustivo.
  sandbox: [],
};

function defaultMinutes(count: number) {
  return Math.max(10, Math.round(count * 1.5));
}

function Dashboard() {
  const navigate = useNavigate();
  const bank = useBank();
  const [history, setHistory] = useState<ExamResult[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [openMode, setOpenMode] = useState<ExamMode | null>(null);

  useEffect(() => {
    setHistory(getHistory());
    setWrongCount(getWrong().length);
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let correct = 0;
    const domainTotals = new Map<DomainKey, { total: number; correct: number }>();
    for (const run of history) {
      total += run.total;
      correct += run.correct;
      for (const domain of run.domains) {
        const entry = domainTotals.get(domain.domain) ?? { total: 0, correct: 0 };
        entry.total += domain.total;
        entry.correct += domain.correct;
        domainTotals.set(domain.domain, entry);
      }
    }
    return {
      total,
      overall: total ? Math.round((correct / total) * 100) : 0,
      domains: DOMAINS.map((domain) => {
        const entry = domainTotals.get(domain.key);
        return {
          ...domain,
          answered: entry?.total ?? 0,
          percent: entry?.total ? Math.round((entry.correct / entry.total) * 100) : 0,
        };
      }),
    };
  }, [history]);

  const bankByDomain = useMemo(() => {
    const map = new Map<DomainKey, number>();
    for (const question of bank) map.set(question.domain, (map.get(question.domain) ?? 0) + 1);
    return map;
  }, [bank]);

  const start = (config: {
    mode: ExamMode;
    count: number;
    minutes: number;
    domains: DomainKey[];
    difficulties: Difficulty[];
  }) => {
    void navigate({
      to: "/exam",
      search: {
        mode: config.mode,
        count: config.count,
        minutes: config.minutes,
        domains: config.domains.join("~"),
        difficulties: config.difficulties.join("~"),
      },
    });
  };

  return (
    <AppShell>
      <section>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="enter text-3xl font-extrabold tracking-tighter">Painel de Controle</h1>
            <p className="enter mt-1 text-sm text-muted-foreground [animation-delay:60ms]">
              {bank.length} questões originais no banco local. Escolha um modo e continue sua
              preparação para a AZ-104.
            </p>
          </div>
          <div className="enter text-right [animation-delay:120ms]">
            <span className="block font-mono text-3xl font-medium tracking-tighter">
              {stats.total ? `${stats.overall}%` : "—"}
            </span>
            <span className="label-caps">Progresso Geral</span>
          </div>
        </div>

        <div className="enter grid grid-cols-1 gap-4 [animation-delay:180ms] sm:grid-cols-2 md:grid-cols-5">
          {stats.domains.map((domain) => (
            <div key={domain.key} className="card-surface p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className="label-caps">{domain.short}</span>
                <span className="font-mono text-xs">
                  {domain.answered ? `${domain.percent}%` : "—"}
                </span>
              </div>
              <Bar percent={domain.answered ? domain.percent : 0} />
              <p className="mt-3 text-[10px] text-muted-foreground">
                {domain.answered} respondidas · {bankByDomain.get(domain.key) ?? 0} no banco
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ModeCard
            title="Simulado Completo"
            description="Prova cronometrada com questões balanceadas entre os cinco domínios oficiais."
            cta="Configurar simulado"
            onClick={() => setOpenMode(openMode === "simulado" ? null : "simulado")}
            active={openMode === "simulado"}
          />
          <ModeCard
            title="Simulado V2 — Exam Sandbox"
            description="Multiple Response, Drag and Drop, Build List, Hot Area, Case Study e Lab Simulation em uma sessão configurável."
            cta="Abrir Exam Sandbox"
            onClick={() => void navigate({ to: "/exam-sandbox" })}
            active={false}
          />
          <ModeCard
            title="Modo Treino"
            description="Resposta e explicação imediatas após cada questão, sem pressão de tempo."
            cta="Configurar treino"
            onClick={() => setOpenMode(openMode === "treino" ? null : "treino")}
            active={openMode === "treino"}
          />
          <ModeCard
            title="Diagnóstico"
            description="25 questões balanceadas para identificar domínios fortes, fracos e tópicos críticos."
            cta="Analisar perfil"
            onClick={() =>
              start({
                mode: "diagnostico",
                count: 25,
                minutes: 40,
                domains: DOMAINS.map((d) => d.key),
                difficulties: ALL_DIFFICULTIES,
              })
            }
            active={false}
          />
          <ModeCard
            title="Modo Domínio"
            description="Foque em um único domínio da AZ-104 e escolha a quantidade de questões."
            cta="Escolher domínio"
            onClick={() => setOpenMode(openMode === "dominio" ? null : "dominio")}
            active={openMode === "dominio"}
          />
          <ModeCard
            title="Meus Erros"
            description={`${wrongCount} questões erradas salvas localmente para revisão dirigida.`}
            cta={wrongCount ? "Estudar somente erros" : "Nenhum erro registrado"}
            disabled={wrongCount === 0}
            onClick={() =>
              start({
                mode: "erros",
                count: Math.min(wrongCount, 60),
                minutes: 0,
                domains: [],
                difficulties: [],
              })
            }
            active={false}
          />
          <ModeCard
            title="Histórico e Progresso"
            description={`${history.length} sessões registradas com desempenho por domínio e tópico.`}
            cta="Ver histórico"
            onClick={() => void navigate({ to: "/historico" })}
            active={false}
          />
        </div>

        {openMode ? (
          <ModeConfig
            mode={openMode}
            onStart={start}
            bankByDomain={bankByDomain}
            onClose={() => setOpenMode(null)}
          />
        ) : null}
      </section>

      {history.length ? (
        <section className="mt-16">
          <h2 className="text-lg font-bold tracking-tight">Sessões recentes</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="label-caps pb-3">Data</th>
                  <th className="label-caps pb-3">Modo</th>
                  <th className="label-caps pb-3">Questões</th>
                  <th className="label-caps pb-3">Score</th>
                  <th className="label-caps pb-3">Tempo</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {history.slice(0, 5).map((run) => (
                  <tr key={run.id} className="border-b border-border">
                    <td className="py-3">{new Date(run.date).toLocaleString("pt-BR")}</td>
                    <td className="py-3">{MODE_LABEL[run.mode]}</td>
                    <td className="py-3 font-mono">{run.total}</td>
                    <td className="py-3 font-mono">{run.percent}%</td>
                    <td className="py-3 font-mono">{formatDuration(run.seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function ModeCard({
  title,
  description,
  cta,
  onClick,
  active,
  disabled = false,
}: {
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  active: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group card-surface p-6 text-left transition-all ${
        disabled ? "cursor-not-allowed opacity-60" : "hover:shadow-xl hover:shadow-foreground/5"
      } ${active ? "border-primary" : ""}`}
    >
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <span className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
        {cta}
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </span>
    </button>
  );
}

function ModeConfig({
  mode,
  onStart,
  onClose,
  bankByDomain,
}: {
  mode: ExamMode;
  bankByDomain: Map<DomainKey, number>;
  onClose: () => void;
  onStart: (config: {
    mode: ExamMode;
    count: number;
    minutes: number;
    domains: DomainKey[];
    difficulties: Difficulty[];
  }) => void;
}) {
  const counts = COUNT_OPTIONS[mode];
  const [count, setCount] = useState<number>(counts[0] ?? 20);
  const [timed, setTimed] = useState(mode === "simulado");
  const [minutes, setMinutes] = useState(defaultMinutes(counts[0] ?? 20));
  const [domain, setDomain] = useState<DomainKey>(DOMAINS[0]!.key);
  const [difficulties, setDifficulties] = useState<Difficulty[]>(ALL_DIFFICULTIES);

  return (
    <div className="card-surface mt-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest">
          Configurar {MODE_LABEL[mode]}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Fechar
        </button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="label-caps">Quantidade de questões</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {counts.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setCount(option);
                  setMinutes(defaultMinutes(option));
                }}
                className={`rounded border px-4 py-2 font-mono text-xs ${
                  count === option
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-surface-subtle"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {mode === "dominio" ? (
          <div>
            <p className="label-caps">Domínio</p>
            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value as DomainKey)}
              className="mt-3 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              {DOMAINS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label} ({bankByDomain.get(item.key) ?? 0})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <p className="label-caps">Dificuldade</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALL_DIFFICULTIES.map((level) => {
              const on = difficulties.includes(level);
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() =>
                    setDifficulties(
                      on ? difficulties.filter((item) => item !== level) : [...difficulties, level],
                    )
                  }
                  className={`rounded border px-4 py-2 text-xs font-semibold ${
                    on
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:bg-surface-subtle"
                  }`}
                >
                  {DIFFICULTY_LABEL[level]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="label-caps">Timer</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTimed(!timed)}
              className={`rounded border px-4 py-2 text-xs font-semibold ${
                timed
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {timed ? "Cronometrado" : "Sem limite"}
            </button>
            {timed ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={minutes}
                  onChange={(event) => setMinutes(Number(event.target.value))}
                  className="w-20 rounded border border-border bg-background px-2 py-2 font-mono text-xs"
                />
                minutos
              </label>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() =>
          onStart({
            mode,
            count,
            minutes: timed ? minutes : 0,
            domains: mode === "dominio" ? [domain] : DOMAINS.map((item) => item.key),
            difficulties: difficulties.length ? difficulties : ALL_DIFFICULTIES,
          })
        }
        className="mt-8 w-full rounded bg-primary py-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-colors hover:opacity-90"
      >
        Iniciar {MODE_LABEL[mode]}
      </button>
      <p className="mt-3 text-center text-[10px] text-muted-foreground">
        As questões e alternativas são randomizadas e não se repetem dentro da mesma sessão.
      </p>
      <div className="mt-4 flex justify-center">
        <NeutralBar percent={100} className="h-0.5 max-w-40" />
      </div>
    </div>
  );
}
