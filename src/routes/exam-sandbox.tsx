import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { NeutralBar } from "@/components/Bar";
import { CaseStudyPanel } from "@/components/CaseStudyPanel";
import { LabSimulationView } from "@/components/LabSimulationView";
import { AnswerExplanation, QuestionMeta, QuestionView } from "@/components/QuestionView";
import { ResultView } from "@/components/ResultView";
import { ALL_DIFFICULTIES, DIFFICULTY_LABEL, DOMAINS } from "@/lib/domains";
import { buildResult, formatClock, isAnswered, isCorrect } from "@/lib/exam";
import { caseStudies, useBank } from "@/lib/questions";
import {
  SANDBOX_STANDALONE_TYPES,
  allSandboxQuestions,
  buildSandboxSession,
  flattenSandboxSession,
  type SandboxConfig,
  type SandboxSession,
  type SandboxStep,
} from "@/lib/sandbox";
import { addResult, registerWrong } from "@/lib/storage";
import type { AnswerState, Difficulty, DomainKey, ExamResult, QuestionType } from "@/lib/types";

export const Route = createFileRoute("/exam-sandbox")({
  head: () => ({
    meta: [
      { title: "Simulado V2 (Exam Sandbox) — AZ-104 Practice Exam" },
      {
        name: "description",
        content:
          "Simulado avançado com múltiplos formatos de questão (Multiple Choice, Multiple Response, Drag and Drop, Build List, Hot Area), Case Study e Lab Simulation, inspirado nos padrões de interação do Exam Sandbox oficial.",
      },
    ],
  }),
  component: ExamSandboxPage,
});

const TYPE_LABEL: Record<QuestionType, string> = {
  "multiple-choice": "Multiple Choice",
  "multiple-response": "Multiple Response",
  "yes-no": "Sim / Não",
  matching: "Matching",
  ordering: "Build List (ordenação)",
  scenario: "Cenário",
  "drag-drop": "Drag and Drop",
  "hot-area": "Hot Area",
  "lab-simulation": "Lab Simulation",
};

const COUNT_OPTIONS = [8, 12, 20, 40];

type Phase = "config" | "summary" | "active" | "reviewing" | "result";

function ExamSandboxPage() {
  const navigate = useNavigate();
  const bank = useBank();

  const [phase, setPhase] = useState<Phase>("config");
  const [count, setCount] = useState(12);
  const [timed, setTimed] = useState(true);
  const [minutes, setMinutes] = useState(120);
  const [domains, setDomains] = useState<DomainKey[]>(DOMAINS.map((d) => d.key));
  const [difficulties, setDifficulties] = useState<Difficulty[]>(ALL_DIFFICULTIES);
  const [types, setTypes] = useState<QuestionType[]>(SANDBOX_STANDALONE_TYPES);
  const [includeCaseStudy, setIncludeCaseStudy] = useState(true);
  const [includeLab, setIncludeLab] = useState(true);

  const [session, setSession] = useState<SandboxSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [current, setCurrent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [confirming, setConfirming] = useState(false);

  const hasLabInBank = useMemo(() => bank.some((q) => q.type === "lab-simulation"), [bank]);
  const hasCaseStudies = caseStudies.length > 0;

  const steps: SandboxStep[] = useMemo(
    () => (session ? flattenSandboxSession(session) : []),
    [session],
  );
  const total = steps.length;

  const buildSession = useCallback(() => {
    const config: SandboxConfig = {
      count,
      minutes: timed ? minutes : 0,
      domains,
      difficulties,
      types,
      includeCaseStudy: includeCaseStudy && hasCaseStudies,
      includeLab: includeLab && hasLabInBank,
    };
    const built = buildSandboxSession(bank, caseStudies, config);
    setSession(built);
    setAnswers({});
    setCurrent(0);
    setElapsed(0);
    setResult(null);
    setPhase("summary");
  }, [
    bank,
    count,
    difficulties,
    domains,
    hasCaseStudies,
    hasLabInBank,
    includeCaseStudy,
    includeLab,
    minutes,
    timed,
    types,
  ]);

  const finish = useCallback(() => {
    if (!session || result) return;
    const allQuestions = allSandboxQuestions(session);
    const finalResult = buildResult("sandbox", allQuestions, answers, elapsed);
    addResult(finalResult);
    const wrongIds = allQuestions
      .filter((item) => !isCorrect(item.question, answers[item.question.id]))
      .map((item) => item.question.id);
    registerWrong(wrongIds);
    setResult(finalResult);
    setConfirming(false);
    setPhase("result");
  }, [answers, elapsed, result, session]);

  // timer
  useEffect(() => {
    if (phase !== "active") return;
    const interval = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === "active" && timed && elapsed >= minutes * 60) finish();
  }, [elapsed, finish, minutes, phase, timed]);

  const setSelected = (id: string, next: number[]) => {
    setAnswers((prev) => {
      const existing = prev[id] ?? { selected: [], flagged: false, revealed: false, seconds: 0 };
      return { ...prev, [id]: { ...existing, selected: next } };
    });
  };

  const toggleFlag = (id: string) => {
    setAnswers((prev) => {
      const existing = prev[id] ?? { selected: [], flagged: false, revealed: false, seconds: 0 };
      return { ...prev, [id]: { ...existing, flagged: !existing.flagged } };
    });
  };

  const toggleType = (type: QuestionType) => {
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };
  const toggleDomain = (key: DomainKey) => {
    setDomains((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  };
  const toggleDifficulty = (level: Difficulty) => {
    setDifficulties((prev) =>
      prev.includes(level) ? prev.filter((d) => d !== level) : [...prev, level],
    );
  };

  const answeredCount = steps.filter((s) => isAnswered(answers[s.sq.question.id])).length;
  const flaggedCount = steps.filter((s) => answers[s.sq.question.id]?.flagged).length;

  const groupStart = {
    standalone: 0,
    "case-study": session?.standalone.length ?? 0,
    lab: (session?.standalone.length ?? 0) + (session?.caseStudy?.questions.length ?? 0),
  } as const;

  /* ---------------------------------------------------------------- CONFIG */
  if (phase === "config") {
    return (
      <AppShell>
        <div className="mb-8">
          <span className="label-caps text-primary">Simulado V2</span>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tighter">Exam Sandbox</h1>
          <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
            Experiência inspirada nos padrões de interação do Exam Sandbox oficial: mistura formatos
            de questão, Case Study e Lab Simulation. Não reproduz conteúdo ou identidade visual da
            Microsoft.
          </p>
        </div>

        <div className="card-surface p-6">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="label-caps">Questões avulsas (standalone)</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {COUNT_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCount(option)}
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

            <div>
              <p className="label-caps">Duração</p>
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
                      min={10}
                      max={480}
                      value={minutes}
                      onChange={(event) => setMinutes(Number(event.target.value))}
                      className="w-20 rounded border border-border bg-background px-2 py-2 font-mono text-xs"
                    />
                    minutos
                  </label>
                ) : null}
              </div>
            </div>

            <div>
              <p className="label-caps">Domínios</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DOMAINS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDomain(d.key)}
                    className={`rounded border px-3 py-2 text-xs font-semibold ${
                      domains.includes(d.key)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-surface-subtle"
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label-caps">Dificuldade</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ALL_DIFFICULTIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleDifficulty(level)}
                    className={`rounded border px-4 py-2 text-xs font-semibold ${
                      difficulties.includes(level)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-surface-subtle"
                    }`}
                  >
                    {DIFFICULTY_LABEL[level]}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="label-caps">Tipos de questão avulsa</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SANDBOX_STANDALONE_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`rounded border px-3 py-2 text-xs font-semibold ${
                      types.includes(type)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-surface-subtle"
                    }`}
                  >
                    {TYPE_LABEL[type]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="label-caps">Case Study</p>
              <button
                type="button"
                disabled={!hasCaseStudies}
                onClick={() => setIncludeCaseStudy(!includeCaseStudy)}
                className={`mt-3 rounded border px-4 py-2 text-xs font-semibold disabled:opacity-40 ${
                  includeCaseStudy && hasCaseStudies
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {hasCaseStudies
                  ? includeCaseStudy
                    ? "Incluído"
                    : "Não incluído"
                  : "Nenhum disponível"}
              </button>
            </div>

            <div>
              <p className="label-caps">Lab Simulation</p>
              <button
                type="button"
                disabled={!hasLabInBank}
                onClick={() => setIncludeLab(!includeLab)}
                className={`mt-3 rounded border px-4 py-2 text-xs font-semibold disabled:opacity-40 ${
                  includeLab && hasLabInBank
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {hasLabInBank ? (includeLab ? "Incluído" : "Não incluído") : "Nenhum disponível"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={buildSession}
            disabled={types.length === 0 || domains.length === 0 || difficulties.length === 0}
            className="mt-10 w-full rounded bg-primary py-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Montar simulado
          </button>
        </div>
      </AppShell>
    );
  }

  /* --------------------------------------------------------------- SUMMARY */
  if (phase === "summary" && session) {
    return (
      <AppShell>
        <div className="card-surface p-8 sm:p-10">
          <span className="label-caps text-primary">Resumo do simulado</span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tighter">Pronto para começar?</h1>

          <dl className="mt-8 grid gap-6 sm:grid-cols-3">
            <SummaryStat label="Questões avulsas" value={String(session.standalone.length)} />
            <SummaryStat
              label="Case Study"
              value={
                session.caseStudy ? `1 (${session.caseStudy.questions.length} questões)` : "Nenhum"
              }
            />
            <SummaryStat
              label="Lab Simulation"
              value={
                session.lab
                  ? `1 (${session.lab.question.labConfig?.tasks.length ?? 0} tarefas)`
                  : "Nenhum"
              }
            />
          </dl>

          <p className="mt-8 text-xs text-muted-foreground">
            Total de itens: <strong className="text-foreground">{total}</strong> · Duração:{" "}
            <strong className="text-foreground">
              {timed ? `${minutes} minutos` : "sem limite"}
            </strong>
            . Você pode marcar questões para revisão e revisar tudo antes de finalizar.
          </p>

          <div className="mt-10 flex gap-3">
            <button
              type="button"
              onClick={() => setPhase("config")}
              className="rounded border border-border px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-subtle"
            >
              Ajustar configuração
            </button>
            <button
              type="button"
              onClick={() => setPhase("active")}
              className="flex-1 rounded bg-primary py-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
            >
              Começar simulado
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  /* --------------------------------------------------------------- LOADING */
  if (!session || total === 0) {
    return (
      <AppShell>
        <div className="card-surface p-10 text-center">
          <h1 className="text-xl font-bold tracking-tight">Nenhuma questão disponível</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ajuste os filtros de domínio, dificuldade ou tipos de questão.
          </p>
          <button
            type="button"
            onClick={() => setPhase("config")}
            className="mt-6 inline-block rounded bg-primary px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
          >
            Voltar à configuração
          </button>
        </div>
      </AppShell>
    );
  }

  /* -------------------------------------------------------------- REVIEWING */
  if (phase === "reviewing" && result) {
    return (
      <AppShell>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-extrabold tracking-tighter">Revisão das questões</h1>
          <button
            type="button"
            onClick={() => setPhase("result")}
            className="rounded border border-border px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-subtle"
          >
            Voltar ao resultado
          </button>
        </div>
        <div className="space-y-6">
          {steps.map((step, index) => {
            const state = answers[step.sq.question.id];
            const ok = isCorrect(step.sq.question, state);
            return (
              <article key={step.sq.question.id} className="card-surface p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="label-caps">
                    {step.kind === "case-study"
                      ? `Case Study — Pergunta ${index + 1}`
                      : step.kind === "lab"
                        ? "Lab Simulation"
                        : `Questão ${index + 1}`}
                  </span>
                  {step.kind !== "lab" ? <QuestionMeta sq={step.sq} /> : null}
                </div>
                {step.kind === "case-study" && step.caseStudy ? (
                  <div className="mb-6 flex flex-col gap-6 lg:flex-row">
                    <CaseStudyPanel caseStudy={step.caseStudy} />
                    <div className="flex-1">
                      <QuestionView
                        sq={step.sq}
                        selected={state?.selected ?? []}
                        reveal
                        onSelect={() => undefined}
                      />
                      <AnswerExplanation sq={step.sq} correct={ok} />
                    </div>
                  </div>
                ) : step.kind === "lab" ? (
                  <LabSimulationView
                    sq={step.sq}
                    selected={state?.selected ?? []}
                    reveal
                    onSelect={() => undefined}
                  />
                ) : (
                  <>
                    <QuestionView
                      sq={step.sq}
                      selected={state?.selected ?? []}
                      reveal
                      onSelect={() => undefined}
                    />
                    <AnswerExplanation sq={step.sq} correct={ok} />
                  </>
                )}
              </article>
            );
          })}
        </div>
      </AppShell>
    );
  }

  /* ----------------------------------------------------------------- RESULT */
  if (phase === "result" && result) {
    return (
      <AppShell>
        <ResultView
          result={result}
          onReview={() => setPhase("reviewing")}
          onRetry={() => setPhase("config")}
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

  /* ------------------------------------------------------------------ ACTIVE */
  const step = steps[current]!;
  const state = answers[step.sq.question.id];
  const remaining = timed ? minutes * 60 - elapsed : elapsed;

  return (
    <AppShell>
      <div className="card-surface overflow-hidden p-0 shadow-xl shadow-foreground/5">
        <div className="flex flex-col gap-3 border-b border-border bg-surface-subtle px-6 py-3 lg:h-14 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="label-caps">Simulado V2</span>
            <span className="h-3 w-px bg-border" />
            <span className="font-mono text-xs font-medium">
              {formatClock(remaining)} {timed ? "restantes" : "decorridos"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <GroupProgress
              label={`Questões (${Math.min(
                answeredCount,
                session.standalone.length,
              )}/${session.standalone.length})`}
              active={step.kind === "standalone"}
              onClick={() => session.standalone.length > 0 && setCurrent(groupStart.standalone)}
              disabled={session.standalone.length === 0}
            />
            {session.caseStudy ? (
              <GroupProgress
                label={`Case Study (${step.kind === "case-study" ? step.indexInGroup : 0}/${session.caseStudy.questions.length})`}
                active={step.kind === "case-study"}
                onClick={() => setCurrent(groupStart["case-study"])}
              />
            ) : null}
            {session.lab ? (
              <GroupProgress
                label="Lab"
                active={step.kind === "lab"}
                onClick={() => setCurrent(groupStart.lab)}
              />
            ) : null}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          <div className="flex-1 p-6 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              {step.kind === "lab" ? (
                <span className="label-caps">Lab Simulation</span>
              ) : (
                <QuestionMeta sq={step.sq} />
              )}
              <button
                type="button"
                onClick={() => toggleFlag(step.sq.question.id)}
                className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  state?.flagged
                    ? "border-warning bg-warning-soft text-warning-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {state?.flagged ? "Marcada para revisão" : "Marcar para revisão"}
              </button>
            </div>

            {step.kind === "case-study" && step.caseStudy ? (
              <div className="mt-8 flex flex-col gap-6 lg:flex-row">
                <CaseStudyPanel caseStudy={step.caseStudy} />
                <div className="flex-1">
                  <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-primary">
                    Pergunta {step.indexInGroup} de {step.groupTotal} do Case Study
                  </p>
                  <QuestionView
                    sq={step.sq}
                    selected={state?.selected ?? []}
                    reveal={false}
                    onSelect={(next) => setSelected(step.sq.question.id, next)}
                  />
                </div>
              </div>
            ) : step.kind === "lab" ? (
              <div className="mt-8">
                <LabSimulationView
                  sq={step.sq}
                  selected={state?.selected ?? []}
                  reveal={false}
                  onSelect={(next) => setSelected(step.sq.question.id, next)}
                />
              </div>
            ) : (
              <div className="mt-8">
                <QuestionView
                  sq={step.sq}
                  selected={state?.selected ?? []}
                  reveal={false}
                  onSelect={(next) => setSelected(step.sq.question.id, next)}
                />
              </div>
            )}

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
            </div>
          </div>

          <aside className="w-full border-t border-border bg-surface-subtle p-6 lg:w-72 lg:border-l lg:border-t-0">
            <span className="label-caps">Navegador</span>
            <div className="mt-4 grid grid-cols-8 gap-2 lg:grid-cols-5">
              {steps.map((navStep, index) => {
                const navState = answers[navStep.sq.question.id];
                const answered = isAnswered(navState);
                const isCurrent = index === current;
                const tone = navState?.flagged
                  ? "border-warning bg-warning-soft text-warning-foreground"
                  : answered
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted-foreground";
                return (
                  <button
                    key={navStep.sq.question.id}
                    type="button"
                    onClick={() => setCurrent(index)}
                    title={
                      navStep.kind === "case-study"
                        ? "Case Study"
                        : navStep.kind === "lab"
                          ? "Lab Simulation"
                          : `Questão ${index + 1}`
                    }
                    className={`flex size-9 items-center justify-center rounded border font-mono text-[10px] font-bold ${tone} ${
                      isCurrent
                        ? "ring-2 ring-primary/30 ring-offset-2 ring-offset-surface-subtle"
                        : ""
                    }`}
                  >
                    {navStep.kind === "case-study" ? "C" : navStep.kind === "lab" ? "L" : ""}
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
                ? `${total - answeredCount} itens ficarão sem resposta e contarão como incorretos.`
                : "Todos os itens foram respondidos."}
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps">{label}</dt>
      <dd className="mt-2 text-2xl font-bold tracking-tight text-primary">{value}</dd>
    </div>
  );
}

function GroupProgress({
  label,
  active,
  onClick,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-1 disabled:opacity-30 ${active ? "text-primary" : ""}`}
    >
      <span>{label}</span>
      <NeutralBar percent={active ? 100 : 30} className="h-0.5 w-20" />
    </button>
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
