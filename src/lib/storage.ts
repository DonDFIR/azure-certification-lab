import type { ExamResult, Question } from "./types";

const K_HISTORY = "az104:history";
const K_WRONG = "az104:wrong";
const K_CUSTOM = "az104:custom-questions";
const K_THEME = "az104:theme";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / modo privado */
  }
}

/* ---------------- Histórico ---------------- */

export function getHistory(): ExamResult[] {
  return read<ExamResult[]>(K_HISTORY, []);
}

export function addResult(result: ExamResult) {
  const history = [result, ...getHistory()].slice(0, 200);
  write(K_HISTORY, history);
}

export function clearHistory() {
  write(K_HISTORY, []);
}

/* ---------------- Questões erradas ---------------- */

export interface WrongEntry {
  id: string;
  misses: number;
  lastDate: string;
}

export function getWrong(): WrongEntry[] {
  return read<WrongEntry[]>(K_WRONG, []);
}

export function registerWrong(ids: string[]) {
  if (!ids.length) return;
  const current = getWrong();
  const map = new Map(current.map((e) => [e.id, e]));
  const now = new Date().toISOString();
  for (const id of ids) {
    const existing = map.get(id);
    map.set(id, { id, misses: (existing?.misses ?? 0) + 1, lastDate: now });
  }
  write(K_WRONG, Array.from(map.values()));
}

export function clearWrongOne(id: string) {
  write(
    K_WRONG,
    getWrong().filter((e) => e.id !== id),
  );
}

export function clearWrongMany(ids: string[]) {
  const set = new Set(ids);
  write(
    K_WRONG,
    getWrong().filter((e) => !set.has(e.id)),
  );
}

export function clearAllWrong() {
  write(K_WRONG, []);
}

/* ---------------- Questões importadas pelo usuário ---------------- */

export function getCustomQuestions(): Question[] {
  return read<Question[]>(K_CUSTOM, []);
}

export function setCustomQuestions(questions: Question[]) {
  write(K_CUSTOM, questions);
}

export function clearCustomQuestions() {
  write(K_CUSTOM, []);
}

/* ---------------- Tema ---------------- */

export type Theme = "light" | "dark";

export function getTheme(): Theme {
  return read<Theme>(K_THEME, "light");
}

export function setTheme(theme: Theme) {
  write(K_THEME, theme);
}
