import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { DIFFICULTY_LABEL, DOMAINS, domainLabel } from "@/lib/domains";
import { correctIndexes } from "@/lib/exam";
import { allTopics, baseQuestions, useBank, validateImport } from "@/lib/questions";
import { clearCustomQuestions, getCustomQuestions, setCustomQuestions } from "@/lib/storage";
import type { DomainKey, Question } from "@/lib/types";

export const Route = createFileRoute("/banco")({
  head: () => ({
    meta: [
      { title: "Banco de Questões — AZ-104 Practice Exam" },
      {
        name: "description",
        content:
          "Explore, pesquise, filtre, importe e exporte o banco local de questões AZ-104 por domínio, tópico e dificuldade.",
      },
      { property: "og:title", content: "Banco de Questões — AZ-104 Practice Exam" },
      {
        property: "og:description",
        content: "Administração local do dataset de questões AZ-104, sem necessidade de login.",
      },
    ],
  }),
  component: QuestionBankPage,
});

const PAGE_SIZE = 20;

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function QuestionBankPage() {
  const bank = useBank();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<DomainKey | "">("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"" | "easy" | "medium" | "hard">("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Question | null>(null);
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [customCount, setCustomCount] = useState(() => getCustomQuestions().length);

  const topics = useMemo(() => allTopics(bank), [bank]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bank.filter((item) => {
      if (domain && item.domain !== domain) return false;
      if (topic && item.topic !== topic) return false;
      if (difficulty && item.difficulty !== difficulty) return false;
      if (
        q &&
        !item.question.toLowerCase().includes(q) &&
        !item.id.toLowerCase().includes(q) &&
        !item.topic.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [bank, domain, topic, difficulty, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const resetFilters = () => {
    setQuery("");
    setDomain("");
    setTopic("");
    setDifficulty("");
    setPage(0);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFile = async (file: File) => {
    setImportMessage(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const result = validateImport(parsed);
      if (!result.ok) {
        setImportMessage({
          ok: false,
          text: `Falha na validação: ${result.errors.slice(0, 5).join(" · ")}${
            result.errors.length > 5 ? ` (+${result.errors.length - 5} outros erros)` : ""
          }`,
        });
        return;
      }
      const existingIds = new Set(bank.map((q) => q.id));
      const existingCustom = getCustomQuestions();
      const customIds = new Set(existingCustom.map((q) => q.id));
      const added: Question[] = [];
      const skipped: string[] = [];
      for (const q of result.questions) {
        if (existingIds.has(q.id) && !customIds.has(q.id)) {
          skipped.push(q.id);
          continue;
        }
        added.push(q);
      }
      const merged = [...existingCustom.filter((q) => !added.some((a) => a.id === q.id)), ...added];
      setCustomQuestions(merged);
      setCustomCount(merged.length);
      setImportMessage({
        ok: true,
        text: `${added.length} questões importadas com sucesso.${
          skipped.length ? ` ${skipped.length} ignoradas por id já existente no banco base.` : ""
        }`,
      });
    } catch {
      setImportMessage({
        ok: false,
        text: "Arquivo inválido: não foi possível interpretar o JSON.",
      });
    }
  };

  return (
    <AppShell>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter">Banco de Questões</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {bank.length} questões no banco local ({baseQuestions.length} originais
            {customCount ? ` + ${customCount} importadas` : ""}). Pesquise, filtre, importe ou
            exporte o dataset.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={handleImportClick}
            className="rounded border border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-subtle"
          >
            Importar JSON
          </button>
          <button
            type="button"
            onClick={() => downloadJson("az104-question-bank.json", bank)}
            className="rounded border border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-subtle"
          >
            Exportar tudo
          </button>
          {customCount ? (
            <button
              type="button"
              onClick={() => {
                clearCustomQuestions();
                setCustomCount(0);
                setImportMessage({ ok: true, text: "Questões importadas removidas." });
              }}
              className="rounded border border-destructive/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive-soft"
            >
              Remover importadas
            </button>
          ) : null}
        </div>
      </div>

      {importMessage ? (
        <div
          className={`mb-6 rounded-lg border p-4 text-sm ${
            importMessage.ok
              ? "border-success bg-success-soft text-success"
              : "border-destructive bg-destructive-soft text-destructive"
          }`}
        >
          {importMessage.text}
        </div>
      ) : null}

      <div className="card-surface p-5">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="label-caps" htmlFor="q-search">
              Pesquisar
            </label>
            <input
              id="q-search"
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Texto da questão, ID ou tópico…"
              className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="label-caps" htmlFor="q-domain">
              Domínio
            </label>
            <select
              id="q-domain"
              value={domain}
              onChange={(event) => {
                setDomain(event.target.value as DomainKey | "");
                setTopic("");
                setPage(0);
              }}
              className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {DOMAINS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-caps" htmlFor="q-difficulty">
              Dificuldade
            </label>
            <select
              id="q-difficulty"
              value={difficulty}
              onChange={(event) => {
                setDifficulty(event.target.value as "" | "easy" | "medium" | "hard");
                setPage(0);
              }}
              className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="easy">{DIFFICULTY_LABEL.easy}</option>
              <option value="medium">{DIFFICULTY_LABEL.medium}</option>
              <option value="hard">{DIFFICULTY_LABEL.hard}</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-caps">Tópico</span>
            <select
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value);
                setPage(0);
              }}
              className="rounded border border-border bg-background px-3 py-1.5 text-xs"
            >
              <option value="">Todos os tópicos</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {filtered.length} questões encontradas · página {page + 1} de {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {pageItems.length === 0 ? (
          <div className="card-surface p-10 text-center text-sm text-muted-foreground">
            Nenhuma questão encontrada com os filtros atuais.
          </div>
        ) : (
          pageItems.map((question) => (
            <button
              key={question.id}
              type="button"
              onClick={() => setOpen(question)}
              className="card-surface flex w-full flex-wrap items-center gap-3 p-4 text-left transition-colors hover:bg-surface-subtle"
            >
              <span className="font-mono text-[10px] text-muted-foreground">{question.id}</span>
              <span className="rounded border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {domainLabel(question.domain)}
              </span>
              <span className="rounded border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {question.topic}
              </span>
              <span className="rounded border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {DIFFICULTY_LABEL[question.difficulty]}
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {question.question.split("\n")[0]}
              </span>
            </button>
          ))
        )}
      </div>

      {open ? <QuestionDetailModal question={open} onClose={() => setOpen(null)} /> : null}
    </AppShell>
  );
}

function QuestionDetailModal({ question, onClose }: { question: Question; onClose: () => void }) {
  // "drag-drop" e "lab-simulation" não usam options/correctAnswer da forma convencional
  // (ver dragDrop/labConfig); evitamos destacar índices sem sentido nesta visualização somente leitura.
  const expected =
    question.type === "drag-drop" || question.type === "lab-simulation"
      ? []
      : correctIndexes(question);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div className="card-surface max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] text-muted-foreground">{question.id}</span>
            <h2 className="mt-1 text-lg font-bold tracking-tight">
              {domainLabel(question.domain)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {question.topic} · {DIFFICULTY_LABEL[question.difficulty]} · {question.type}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-subtle"
          >
            Fechar
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {question.question.split("\n").map((line, index) => (
            <p key={index} className="text-sm leading-relaxed">
              {line}
            </p>
          ))}
        </div>

        <ul className="mt-6 space-y-2">
          {question.options.map((optionText, index) => (
            <li
              key={index}
              className={`rounded border px-3 py-2 text-sm ${
                expected.includes(index)
                  ? "border-success bg-success-soft"
                  : "border-border text-muted-foreground"
              }`}
            >
              {optionText}
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-lg border border-border bg-surface-subtle p-4">
          <p className="label-caps">Explicação</p>
          <p className="mt-2 text-sm leading-relaxed">{question.explanation}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs text-muted-foreground">Referência: {question.reference}</span>
            {question.referenceUrl ? (
              <a
                href={question.referenceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded border border-border bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-surface"
              >
                Ver referência
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
