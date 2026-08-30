import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { NeutralBar } from "@/components/Bar";
import { AnswerExplanation, QuestionMeta, QuestionView } from "@/components/QuestionView";
import { ResultView } from "@/components/ResultView";
import { ALL_DIFFICULTIES, DOMAINS, MODE_LABEL } from "@/lib/domains";
import {
  buildResult,
  formatClock,
  formatDuration,
  isAnswered,
  isCorrect,
  selectQuestions,
  toSessionQuestion,
} from "@/lib/exam";
import { useBank } from "@/lib/questions";
import { addResult, clearWrongMany, getWrong, registerWrong } from "@/lib/storage";
import type {
  AnswerState,
  Difficulty,
  DomainKey,
  ExamMode,
  ExamResult,
  SessionQuestion,
} from "@/lib/types";

interface ExamSearch {
  mode: ExamMode;
  count: number;
  minutes: number;
  domains: string;
  difficulties: string;
}

const MODES: ExamMode[] = ["simulado", "treino", "dominio", "erros", "diagnostico"];

export const Route = createFileRoute("/exam")({
  validateSearch: (search: Record<string, unknown>): ExamSearch => {
    const mode = MODES.includes(search["mode"] as ExamMode)
      ? (search["mode"] as ExamMode)
      : "simulado";
    const count = Number(search["count"]);
    const minutes = Number(search["minutes"]);
    return {
      mode,
      count: Number.isFinite(count) && count > 0 ? Math.min(200, Math.round(count)) : 20,
      minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 0,
      domains: typeof search["domains"] === "string" ? search["domains"] : "",
      difficulties: typeof search["difficulties"] === "string" ? search["difficulties"] : "",
    };
  },
  head: () => ({
    meta: [
      { title: "Sessão de prova — AZ-104 Practice Exam" },
      {
        name: "description",
        content:
          "Responda a sessão em andamento com timer, navegador de questões, marcação para revisão e resultado detalhado por domínio.",
      },
      { property: "og:title", content: "Sessão de prova — AZ-104 Practice Exam" },
      {
        property: "og:description",
        content: "Interface de prova AZ-104 com timer, navegação e revisão de questões.",
      },
    ],
  }),
  component: ExamPage,
});

function ExamPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const bank = useBank();

  const [session, setSession] = useState<SessionQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [current, setCurrent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [seed, setSeed] = useState(0);
  const startedRef = useRef(false);

  const trainingMode = search.mode === "treino" || search.mode === "erros";

  // monta a sessão no cliente (randomização não deve ocorrer no SSR)
  useEffect(() => {
    if (startedRef.current || bank.length === 0) return;
    startedRef.current = true;

    const domains = search.domains
      ? (search.domains.split("~").filter(Boolean) as DomainKey[])
      : DOMAINS.map((d) => d.key);
    const difficulties = search.difficulties
      ? (search.difficulties.split("~").filter(Boolean) as Difficulty[])
      : ALL_DIFFICULTIES;

    let pool = bank;
    if (search.mode === "erros") {
      const ids = new Set(getWrong().map((entry) => entry.id));
      pool = bank.filter((question) => ids.has(question.id));
    }

    const picked = selectQuestions(pool, {
      mode: search.mode,
      count: search.count,
      minutes: search.minutes,
      domains: search.mode === "erros" ? [] : domains,
      difficulties: search.mode === "erros" ? [] : difficulties,
    });

    setSession(picked.map(toSessionQuestion));
    setAnswers({});
    setCurrent(0);
    setElapsed(0);
    setResult(null);
    setReviewing(false);
  }, [bank, search, seed]);

  const finish = useCallback(() => {
    if (!session || result) return;
    const finalResult = buildResult(search.mode, session, answers, elapsed);
    addResult(finalResult);

    const wrongIds = session
      .filter((item) => !isCorrect(item.question, answers[item.question.id]))
      .map((item) => item.question.id);
    const correctIds = session
      .filter((item) => isCorrect(item.question, answers[item.question.id]))
      .map((item) => item.question.id);
    registerWrong(wrongIds);
    if (search.mode === "erros") clearWrongMany(correctIds);

    setResult(finalResult);
    setConfirming(false);
  }, [answers, elapsed, result, search.mode, session]);

  // timer
  useEffect(() => {
    if (!session || result) return;
    const interval = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [session, result]);

  useEffect(() => {
    if (search.minutes > 0 && !result && session && elapsed >= search.minutes * 60) finish();
  }, [elapsed, finish, result, search.minutes, session]);

  const total = session?.length ?? 0;
  const answeredCount = session
    ? session.filter((item) => isAnswered(answers[item.question.id])).length
    : 0;
  const flaggedCount = session
    ? session.filter((item) => answers[item.question.id]?.flagged).length
    : 0;

  const setSelected = (id: string, next: number[]) => {
    setAnswers((prev) => {
      const existing = prev[id] ?? { selected: [], flagged: false, revealed: false, seconds: 0 };
      return {
        ...prev,
        [id]: {
          ...existing,
          selected: next,
          revealed: trainingMode ? true : existing.revealed,
        },
      };
    });
  };

  const toggleFlag = (id: string) => {
    setAnswers((prev) => {
      const existing = prev[id] ?? { selected: [], flagged: false, revealed: false, seconds: 0 };
      return { ...prev, [id]: { ...existing, flagged: !existing.flagged } };
    });
  };

  const restart = () => {
    startedRef.current = false;
    setSeed((value) => value + 1);
  };

  if (!session) {
    return (
      <AppShell>
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-muted-foreground">Preparando questões…</p>
          <div className="mx-auto mt-4 max-w-40">
            <NeutralBar percent={40} />
          </div>
        </div>
      </AppShell>
    );
  }

  if (total === 0) {
    return (
      <AppShell>
        <div className="card-surface p-10 text-center">
          <h1 className="text-xl font-bold tracking-tight">Nenhuma questão disponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajuste os filtros de domínio e dificuldade, ou importe mais questões no Banco de
            Questões.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded bg-primary px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
          >
            Voltar ao painel
          </Link>
        </div>
      </AppShell>
    );
  }

  if (result && reviewing) {
    return (
      <AppShell>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold tracking-tighter">Revisão das questões</h1>
          <button
            type="button"
            onClick={() => setReviewing(false)}
            className="rounded border border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-subtle"
          >
            Voltar ao resultado
          </button>
        </div>
        <div className="space-y-6">
          {session.map((item, index) => {
            const state = answers[item.question.id];
            const ok = isCorrect(item.question, state);
            return (
              <article key={item.question.id} className="card-surface p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="label-caps">Questão {index + 1}</span>
                  <QuestionMeta sq={item} />
                </div>
                <QuestionView
                  sq={item}
                  selected={state?.selected ?? []}
                  reveal
                  onSelect={() => undefined}
                />
                <AnswerExplanation sq={item} correct={ok} />
              </article>
            );
          })}
        </div>
      </AppShell>
    );
  }

  if (result) {
    return (
      <AppShell>
        <ResultView
          result={result}
          onReview={() => setReviewing(true)}
          onRetry={restart}
          onStudyErrors={() =>
            void navigate({
              to: "/exam",
              search: {
                mode: "erros",
                count: Math.max(1, result.wrongIds.length),
                minutes: 0,
                domains: "",
                difficulties: "",
              },
            })
          }
        />
      </AppShell>
    );
  }

  const item = session[current]!;
  const state = answers[item.question.id];
  const reveal = trainingMode && !!state?.revealed;
  const remaining = search.minutes > 0 ? search.minutes * 60 - elapsed : elapsed;

  return (
    <AppShell>
      <div className="card-surface overflow-hidden p-0 shadow-xl shadow-foreground/5">
        <div className="flex flex-col gap-3 border-b border-border bg-surface-subtle px-6 py-3 sm:h-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
          <div className="flex items-center gap-4">
            <span className="label-caps">Modo {MODE_LABEL[search.mode]}</span>
            <span className="h-3 w-px bg-border" />
            <span className="font-mono text-xs font-medium">
              {formatClock(remaining)} {search.minutes > 0 ? "restantes" : "decorridos"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32">
              <NeutralBar percent={((current + 1) / total) * 100} />
            </div>
            <span className="font-mono text-[10px] uppercase text-muted-foreground">
              Questão {current + 1}/{total}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <QuestionMeta sq={item} />
              <button
                type="button"
                onClick={() => toggleFlag(item.question.id)}
                className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  state?.flagged
                    ? "border-warning bg-warning-soft text-warning-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {state?.flagged ? "Marcada para revisão" : "Marcar para revisão"}
              </button>
            </div>

            <div className="mt-8">
              <QuestionView
                sq={item}
                selected={state?.selected ?? []}
                reveal={reveal}
                onSelect={(next) => setSelected(item.question.id, next)}
              />
            </div>

            {reveal ? (
              <AnswerExplanation sq={item} correct={isCorrect(item.question, state)} />
            ) : null}

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrent((value) => Math.max(0, value - 1))}
                disabled={current === 0}
                className="h-10 rounded border border-border px-6 text-sm font-semibold transition-colors hover:bg-surface-subtle disabled:opacity-40"
              >
                Anterior
              </button>
              {current < total - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrent((value) => Math.min(total - 1, value + 1))}
                  className="h-10 rounded bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-90"
                >
                  Próxima
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="h-10 rounded bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Finalizar
                </button>
              )}
              {trainingMode && state?.revealed ? (
                <button
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [item.question.id]: {
                        selected: [],
                        flagged: prev[item.question.id]?.flagged ?? false,
                        revealed: false,
                        seconds: 0,
                      },
                    }))
                  }
                  className="h-10 rounded border border-border px-6 text-sm font-semibold hover:bg-surface-subtle"
                >
                  Repetir questão
                </button>
              ) : null}
            </div>
          </div>

          <aside className="w-full border-t border-border bg-surface-subtle p-6 lg:w-72 lg:border-l lg:border-t-0">
            <span className="label-caps">Navegador</span>
            <div className="mt-4 grid grid-cols-8 gap-2 lg:grid-cols-5">
              {session.map((navItem, index) => {
                const navState = answers[navItem.question.id];
                const answered = isAnswered(navState);
                const isCurrent = index === current;
                const tone = navState?.flagged
                  ? "border-warning bg-warning-soft text-warning-foreground"
                  : answered
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted-foreground";
                return (
                  <button
                    key={navItem.question.id}
                    type="button"
                    onClick={() => setCurrent(index)}
                    className={`flex size-9 items-center justify-center rounded border font-mono text-[10px] font-bold ${tone} ${
                      isCurrent
                        ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-surface-subtle"
                        : ""
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
            <div className="mt-8 space-y-2">
              <SideStat label="Respondidas" value={answeredCount} />
              <SideStat label="Revisar" value={flaggedCount} />
              <SideStat label="Faltam" value={total - answeredCount} />
            </div>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="mt-10 w-full rounded border border-destructive/40 py-3 text-[10px] font-bold uppercase tracking-widest text-destructive transition-colors hover:bg-destructive-soft"
            >
              Finalizar Exame
            </button>
          </aside>
        </div>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="card-surface w-full max-w-md p-6">
            <h2 className="text-lg font-bold tracking-tight">Finalizar a sessão?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {total - answeredCount > 0
                ? `${total - answeredCount} questões ficarão sem resposta e contarão como incorretas.`
                : "Todas as questões foram respondidas."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded border border-border py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-subtle"
              >
                Continuar prova
              </button>
              <button
                type="button"
                onClick={finish}
                className="flex-1 rounded bg-primary py-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
              >
                Finalizar agora
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function SideStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="font-mono">{String(value).padStart(2, "0")}</span>
    </div>
  );
}
