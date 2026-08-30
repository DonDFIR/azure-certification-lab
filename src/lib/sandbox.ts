import { shuffle, selectQuestions, toSessionQuestion } from "./exam";
import type {
  CaseStudy,
  Difficulty,
  DomainKey,
  ExamConfig,
  Question,
  QuestionType,
  SessionQuestion,
} from "./types";

/** Types que podem compor a lista de questões avulsas (standalone) do Simulado V2. */
export const SANDBOX_STANDALONE_TYPES: QuestionType[] = [
  "multiple-choice",
  "multiple-response",
  "yes-no",
  "matching",
  "ordering",
  "scenario",
  "drag-drop",
  "hot-area",
];

export interface SandboxConfig {
  count: number;
  minutes: number;
  domains: DomainKey[];
  difficulties: Difficulty[];
  /** Types de questão avulsa incluídos. Vazio = todos. */
  types: QuestionType[];
  includeCaseStudy: boolean;
  includeLab: boolean;
}

export interface SandboxSession {
  standalone: SessionQuestion[];
  caseStudy?: { caseStudy: CaseStudy; questions: SessionQuestion[] };
  lab?: SessionQuestion;
}

/** Monta a sessão do Simulado V2: pool de avulsas + um Case Study + um Lab, conforme config. */
export function buildSandboxSession(
  bank: Question[],
  caseStudies: CaseStudy[],
  config: SandboxConfig,
): SandboxSession {
  const standalonePool = bank.filter(
    (q) =>
      q.type !== "lab-simulation" &&
      !q.caseStudyId &&
      (config.types.length === 0 || config.types.includes(q.type)),
  );

  const examConfig: ExamConfig = {
    mode: "sandbox",
    count: config.count,
    minutes: config.minutes,
    domains: config.domains,
    difficulties: config.difficulties,
  };
  const standalone = selectQuestions(standalonePool, examConfig).map(toSessionQuestion);

  let caseStudyBlock: SandboxSession["caseStudy"];
  if (config.includeCaseStudy && caseStudies.length > 0) {
    const chosen = shuffle(caseStudies)[0]!;
    const byId = new Map(bank.map((q) => [q.id, q]));
    const questions = chosen.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is Question => Boolean(q))
      .map(toSessionQuestion);
    if (questions.length > 0) caseStudyBlock = { caseStudy: chosen, questions };
  }

  let lab: SessionQuestion | undefined;
  if (config.includeLab) {
    const labPool = bank.filter((q) => q.type === "lab-simulation");
    if (labPool.length > 0) lab = toSessionQuestion(shuffle(labPool)[0]!);
  }

  // Construído via spread condicional (em vez de atribuir undefined diretamente) para
  // respeitar exactOptionalPropertyTypes do tsconfig.
  return {
    standalone,
    ...(caseStudyBlock ? { caseStudy: caseStudyBlock } : {}),
    ...(lab ? { lab } : {}),
  };
}

export type SandboxStepKind = "standalone" | "case-study" | "lab";

export interface SandboxStep {
  kind: SandboxStepKind;
  sq: SessionQuestion;
  caseStudy?: CaseStudy;
  /** Posição (1-based) dentro do próprio grupo (ex.: pergunta 2 de 3 do Case Study). */
  indexInGroup: number;
  groupTotal: number;
}

/** Achata a sessão em uma sequência única de passos navegáveis, na ordem Standalone → Case Study → Lab. */
export function flattenSandboxSession(session: SandboxSession): SandboxStep[] {
  const steps: SandboxStep[] = [];
  session.standalone.forEach((sq, i) =>
    steps.push({
      kind: "standalone",
      sq,
      indexInGroup: i + 1,
      groupTotal: session.standalone.length,
    }),
  );
  if (session.caseStudy) {
    const { caseStudy, questions } = session.caseStudy;
    questions.forEach((sq, i) =>
      steps.push({
        kind: "case-study",
        sq,
        caseStudy,
        indexInGroup: i + 1,
        groupTotal: questions.length,
      }),
    );
  }
  if (session.lab) {
    steps.push({ kind: "lab", sq: session.lab, indexInGroup: 1, groupTotal: 1 });
  }
  return steps;
}

/** Todas as SessionQuestion da sessão, em uma lista só — para reaproveitar buildResult() sem alterá-lo. */
export function allSandboxQuestions(session: SandboxSession): SessionQuestion[] {
  return [
    ...session.standalone,
    ...(session.caseStudy?.questions ?? []),
    ...(session.lab ? [session.lab] : []),
  ];
}
