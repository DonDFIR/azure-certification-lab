import type { DomainKey, Difficulty, ExamMode } from "./types";

export const DOMAINS: { key: DomainKey; label: string; short: string; weight: number }[] = [
  {
    key: "Identity and Governance",
    label: "Manage Azure identities and governance",
    short: "Identity",
    weight: 0.22,
  },
  { key: "Storage", label: "Implement and manage storage", short: "Storage", weight: 0.18 },
  {
    key: "Compute",
    label: "Deploy and manage Azure compute resources",
    short: "Compute",
    weight: 0.25,
  },
  {
    key: "Networking",
    label: "Implement and manage virtual networking",
    short: "Networking",
    weight: 0.2,
  },
  {
    key: "Monitoring",
    label: "Monitor and maintain Azure resources",
    short: "Monitoring",
    weight: 0.15,
  },
];

export const DOMAIN_KEYS = DOMAINS.map((d) => d.key);

export function domainLabel(key: DomainKey): string {
  return DOMAINS.find((d) => d.key === key)?.label ?? key;
}

export function domainShort(key: DomainKey): string {
  return DOMAINS.find((d) => d.key === key)?.short ?? key;
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Difícil",
};

export const MODE_LABEL: Record<ExamMode, string> = {
  simulado: "Simulado",
  treino: "Treino",
  dominio: "Por domínio",
  erros: "Meus erros",
  diagnostico: "Diagnóstico",
  sandbox: "Simulado V2 (Exam Sandbox)",
};

export const ALL_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
