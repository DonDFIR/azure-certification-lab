export type Difficulty = "easy" | "medium" | "hard";

export type QuestionType =
  | "multiple-choice"
  | "multiple-response"
  | "yes-no"
  | "matching"
  | "ordering"
  | "scenario"
  /** V2 (Exam Sandbox): item arrastado até uma categoria/área de destino. */
  | "drag-drop"
  /** V2 (Exam Sandbox): seleção de uma ou mais "regiões" — aproximação do Hot Area oficial. */
  | "hot-area"
  /** V2 (Exam Sandbox): conjunto de tarefas de configuração avaliadas em bloco. */
  | "lab-simulation";

export type DomainKey =
  "Identity and Governance" | "Storage" | "Compute" | "Networking" | "Monitoring";

export interface MatchingPair {
  left: string;
  right: string;
}

/** Apenas para type = "drag-drop". */
export interface DragDropItem {
  id: string;
  label: string;
  /** Índice da categoria correta em dragDrop.categories. */
  correctCategory: number;
}

export interface DragDropConfig {
  categories: string[];
  items: DragDropItem[];
}

/** Apenas para type = "lab-simulation". */
export interface LabTask {
  id: string;
  label: string;
  options: string[];
  correctOption: number;
}

export interface LabConfig {
  scenario: string;
  requirements: string[];
  tasks: LabTask[];
}

/** Case Study: agrupa múltiplas questões (de qualquer type) sob um mesmo cenário. */
export interface CaseStudy {
  id: string;
  title: string;
  context: string;
  requirements: string[];
  environment: string;
  /** IDs de Question, na ordem em que aparecem dentro do Case Study. */
  questionIds: string[];
}

export interface Question {
  id: string;
  domain: DomainKey;
  topic: string;
  difficulty: Difficulty;
  type: QuestionType;
  question: string;
  /** Alternativas. Para "ordering", é a lista na ordem correta. Não usado por "drag-drop"/"lab-simulation". */
  options: string[];
  /** Índice único, ou lista de índices (multiple-response / ordering). Não usado por "drag-drop"/"lab-simulation". */
  correctAnswer: number | number[];
  explanation: string;
  reference: string;
  referenceUrl?: string;
  /** Apenas para type = "matching". */
  pairs?: MatchingPair[];
  /** Apenas para type = "drag-drop". */
  dragDrop?: DragDropConfig;
  /** Apenas para type = "lab-simulation". */
  labConfig?: LabConfig;
  /** Quando presente, a questão pertence ao Case Study com esse id (ver case-studies.json). */
  caseStudyId?: string;
}

/** Questão preparada para uma sessão: alternativas já embaralhadas. */
export interface SessionQuestion {
  question: Question;
  /** Ordem exibida: cada item é o índice original em question.options. */
  order: number[];
  /** Para matching: opções da direita embaralhadas. */
  rightOrder?: number[];
}

export type ExamMode = "simulado" | "treino" | "dominio" | "erros" | "diagnostico" | "sandbox";

export interface ExamConfig {
  mode: ExamMode;
  count: number;
  minutes: number;
  domains: DomainKey[];
  difficulties: Difficulty[];
}

export interface AnswerState {
  /** Índices originais das alternativas escolhidas (ou ordem, em ordering). */
  selected: number[];
  flagged: boolean;
  revealed: boolean;
  seconds: number;
}

export interface DomainScore {
  domain: DomainKey;
  total: number;
  correct: number;
  percent: number;
}

export interface TopicScore {
  topic: string;
  domain: DomainKey;
  total: number;
  correct: number;
  percent: number;
}

export interface ExamResult {
  id: string;
  date: string;
  mode: ExamMode;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percent: number;
  seconds: number;
  avgSeconds: number;
  domains: DomainScore[];
  topics: TopicScore[];
  wrongIds: string[];
}
