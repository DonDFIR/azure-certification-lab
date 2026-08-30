import { DOMAINS } from "./domains";
import type {
  AnswerState,
  DomainKey,
  DomainScore,
  ExamConfig,
  ExamResult,
  Question,
  SessionQuestion,
  TopicScore,
} from "./types";

export function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = array[i] as T;
    const b = array[j] as T;
    array[i] = b;
    array[j] = a;
  }
  return array;
}

export function correctIndexes(question: Question): number[] {
  return Array.isArray(question.correctAnswer)
    ? [...question.correctAnswer]
    : [question.correctAnswer];
}

/**
 * Resposta esperada de uma questão, na representação usada por AnswerState.selected.
 * Para os types padrão, é equivalente a correctIndexes(). "drag-drop" e "lab-simulation"
 * têm sua própria fonte de verdade (dragDrop.items / labConfig.tasks), pois não usam
 * options/correctAnswer da forma convencional.
 */
export function expectedAnswer(question: Question): number[] {
  if (question.type === "drag-drop" && question.dragDrop) {
    return question.dragDrop.items.map((item) => item.correctCategory);
  }
  if (question.type === "lab-simulation" && question.labConfig) {
    return question.labConfig.tasks.map((task) => task.correctOption);
  }
  return correctIndexes(question);
}

/** Embaralha alternativas, exceto em yes-no (mantém Sim/Não), ordering e drag-drop/lab-simulation. */
export function toSessionQuestion(question: Question): SessionQuestion {
  if (question.type === "drag-drop" && question.dragDrop) {
    const order = shuffle(question.dragDrop.items.map((_, i) => i));
    return { question, order };
  }
  if (question.type === "lab-simulation") {
    return { question, order: [] };
  }
  const indexes = question.options.map((_, i) => i);
  const keepOrder = question.type === "yes-no";
  const order = keepOrder ? indexes : shuffle(indexes);
  const base: SessionQuestion = { question, order };
  if (question.type === "matching") base.rightOrder = shuffle(indexes);
  return base;
}

/** Seleciona questões respeitando domínios, dificuldade e distribuição por peso. */
export function selectQuestions(bank: Question[], config: ExamConfig): Question[] {
  // "lab-simulation" e questões de Case Study (caseStudyId) têm renderização própria e são
  // montadas separadamente pelo engine do Simulado V2 (ver sandbox.ts); nos demais modos
  // (V1) elas ficam de fora do pool para não cair no renderer padrão sem suporte a elas.
  const basePool =
    config.mode === "sandbox"
      ? bank
      : bank.filter((q) => q.type !== "lab-simulation" && !q.caseStudyId);

  const pool = basePool.filter(
    (q) =>
      (config.domains.length === 0 || config.domains.includes(q.domain)) &&
      (config.difficulties.length === 0 || config.difficulties.includes(q.difficulty)),
  );

  const count = Math.min(config.count, pool.length);
  const useBalanced = config.domains.length !== 1 && config.mode !== "erros";
  if (!useBalanced) return shuffle(pool).slice(0, count);

  const activeDomains = DOMAINS.filter(
    (d) => config.domains.length === 0 || config.domains.includes(d.key),
  );
  const totalWeight = activeDomains.reduce((sum, d) => sum + d.weight, 0);

  const picked: Question[] = [];
  const used = new Set<string>();

  for (const domain of activeDomains) {
    const quota = Math.round((domain.weight / totalWeight) * count);
    const domainPool = shuffle(pool.filter((q) => q.domain === domain.key));
    for (const question of domainPool.slice(0, quota)) {
      picked.push(question);
      used.add(question.id);
    }
  }

  // completa ou apara para o total exato
  if (picked.length < count) {
    const rest = shuffle(pool.filter((q) => !used.has(q.id)));
    picked.push(...rest.slice(0, count - picked.length));
  }
  return shuffle(picked).slice(0, count);
}

export function isAnswered(state: AnswerState | undefined): boolean {
  return !!state && state.selected.length > 0;
}

export function isCorrect(question: Question, state: AnswerState | undefined): boolean {
  if (!state || state.selected.length === 0) return false;
  const expected = expectedAnswer(question);
  if (
    question.type === "ordering" ||
    question.type === "matching" ||
    question.type === "drag-drop" ||
    question.type === "lab-simulation"
  ) {
    return (
      state.selected.length === expected.length &&
      state.selected.every((value, index) => value === expected[index])
    );
  }
  if (state.selected.length !== expected.length) return false;
  const sortedSelected = [...state.selected].sort((a, b) => a - b);
  const sortedExpected = [...expected].sort((a, b) => a - b);
  return sortedSelected.every((value, index) => value === sortedExpected[index]);
}

export function buildResult(
  mode: ExamConfig["mode"],
  session: SessionQuestion[],
  answers: Record<string, AnswerState>,
  seconds: number,
): ExamResult {
  let correct = 0;
  let unanswered = 0;
  const wrongIds: string[] = [];

  const domainMap = new Map<DomainKey, { total: number; correct: number }>();
  const topicMap = new Map<string, { domain: DomainKey; total: number; correct: number }>();

  for (const item of session) {
    const { question } = item;
    const state = answers[question.id];
    const answered = isAnswered(state);
    const ok = answered && isCorrect(question, state);

    if (!answered) unanswered += 1;
    if (ok) correct += 1;
    else wrongIds.push(question.id);

    const domainEntry = domainMap.get(question.domain) ?? { total: 0, correct: 0 };
    domainEntry.total += 1;
    if (ok) domainEntry.correct += 1;
    domainMap.set(question.domain, domainEntry);

    const topicEntry = topicMap.get(question.topic) ?? {
      domain: question.domain,
      total: 0,
      correct: 0,
    };
    topicEntry.total += 1;
    if (ok) topicEntry.correct += 1;
    topicMap.set(question.topic, topicEntry);
  }

  const total = session.length;
  const domains: DomainScore[] = Array.from(domainMap.entries()).map(([domain, value]) => ({
    domain,
    total: value.total,
    correct: value.correct,
    percent: value.total ? Math.round((value.correct / value.total) * 100) : 0,
  }));
  const topics: TopicScore[] = Array.from(topicMap.entries()).map(([topic, value]) => ({
    topic,
    domain: value.domain,
    total: value.total,
    correct: value.correct,
    percent: value.total ? Math.round((value.correct / value.total) * 100) : 0,
  }));

  return {
    id: `run-${Date.now()}`,
    date: new Date().toISOString(),
    mode,
    total,
    correct,
    incorrect: total - correct - unanswered,
    unanswered,
    percent: total ? Math.round((correct / total) * 100) : 0,
    seconds,
    avgSeconds: total ? Math.round(seconds / total) : 0,
    domains,
    topics,
    wrongIds,
  };
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function scoreTone(percent: number): "success" | "warning" | "destructive" {
  if (percent >= 70) return "success";
  if (percent >= 55) return "warning";
  return "destructive";
}
