import { useEffect, useState } from "react";

import rawCaseStudies from "@/data/case-studies.json";
import rawQuestions from "@/data/questions.json";
import { getCustomQuestions } from "./storage";
import type { CaseStudy, Question } from "./types";

export const baseQuestions = rawQuestions as unknown as Question[];
export const caseStudies = rawCaseStudies as unknown as CaseStudy[];

/** Banco completo: dataset local + questões importadas pelo usuário. */
export function getBank(): Question[] {
  const custom = getCustomQuestions();
  if (!custom.length) return baseQuestions;
  const seen = new Set(baseQuestions.map((q) => q.id));
  return [...baseQuestions, ...custom.filter((q) => !seen.has(q.id))];
}

/** Hook client-safe: SSR usa apenas o dataset local, depois inclui os importados. */
export function useBank(): Question[] {
  const [bank, setBank] = useState<Question[]>(baseQuestions);
  useEffect(() => {
    setBank(getBank());
  }, []);
  return bank;
}

export function questionById(bank: Question[], id: string): Question | undefined {
  return bank.find((q) => q.id === id);
}

export function allTopics(bank: Question[]): string[] {
  return Array.from(new Set(bank.map((q) => q.topic))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export interface ValidationResult {
  ok: boolean;
  questions: Question[];
  errors: string[];
}

const DOMAINS = ["Identity and Governance", "Storage", "Compute", "Networking", "Monitoring"];
const TYPES = [
  "multiple-choice",
  "multiple-response",
  "yes-no",
  "matching",
  "ordering",
  "scenario",
  "drag-drop",
  "hot-area",
  "lab-simulation",
];
/** Types cujo schema de resposta não é o padrão options/correctAnswer. */
const CUSTOM_ANSWER_TYPES = new Set(["drag-drop", "lab-simulation"]);
const DIFFICULTIES = ["easy", "medium", "hard"];

/** Valida um JSON importado antes de gravar no localStorage. */
export function validateImport(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(input)) {
    return { ok: false, questions: [], errors: ["O JSON deve ser um array de questões."] };
  }

  const questions: Question[] = [];
  input.forEach((item, index) => {
    const label = `Item ${index + 1}`;
    if (typeof item !== "object" || item === null) {
      errors.push(`${label}: não é um objeto.`);
      return;
    }
    const q = item as Record<string, unknown>;
    const problems: string[] = [];
    if (typeof q["id"] !== "string" || !q["id"]) problems.push("id inválido");
    if (typeof q["domain"] !== "string" || !DOMAINS.includes(q["domain"] as string))
      problems.push("domain inválido");
    if (typeof q["topic"] !== "string" || !q["topic"]) problems.push("topic inválido");
    if (typeof q["difficulty"] !== "string" || !DIFFICULTIES.includes(q["difficulty"] as string))
      problems.push("difficulty inválido");
    if (typeof q["type"] !== "string" || !TYPES.includes(q["type"] as string))
      problems.push("type inválido");
    if (typeof q["question"] !== "string" || q["question"].length < 5)
      problems.push("question inválido");

    const type = q["type"] as string;
    const isCustomAnswerType = CUSTOM_ANSWER_TYPES.has(type);

    if (!isCustomAnswerType) {
      const options = q["options"];
      if (
        !Array.isArray(options) ||
        options.length < 2 ||
        options.some((o) => typeof o !== "string")
      )
        problems.push("options inválido");
      const correct = q["correctAnswer"];
      const maxIndex = Array.isArray(options) ? options.length - 1 : -1;
      const validIndex = (value: unknown) =>
        typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maxIndex;
      if (
        Array.isArray(correct)
          ? !correct.length || !correct.every(validIndex)
          : !validIndex(correct)
      )
        problems.push("correctAnswer inválido");
    }
    if (type === "drag-drop") {
      const dragDrop = q["dragDrop"] as Record<string, unknown> | undefined;
      const categories = dragDrop?.["categories"];
      const items = dragDrop?.["items"];
      if (!Array.isArray(categories) || categories.length < 2)
        problems.push("dragDrop.categories inválido");
      if (!Array.isArray(items) || items.length < 2) problems.push("dragDrop.items inválido");
    }
    if (type === "lab-simulation") {
      const labConfig = q["labConfig"] as Record<string, unknown> | undefined;
      const tasks = labConfig?.["tasks"];
      if (typeof labConfig?.["scenario"] !== "string" || !labConfig["scenario"])
        problems.push("labConfig.scenario ausente");
      if (!Array.isArray(tasks) || tasks.length < 1) problems.push("labConfig.tasks inválido");
    }

    if (typeof q["explanation"] !== "string" || !q["explanation"])
      problems.push("explanation ausente");
    if (typeof q["reference"] !== "string" || !q["reference"]) problems.push("reference ausente");

    if (problems.length)
      errors.push(`${label} (${String(q["id"] ?? "sem id")}): ${problems.join(", ")}`);
    else questions.push(item as Question);
  });

  return { ok: errors.length === 0, questions, errors };
}
