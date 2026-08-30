import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { AnswerExplanation, QuestionMeta } from "@/components/QuestionView";
import { useBank } from "@/lib/questions";
import { toSessionQuestion } from "@/lib/exam";
import { clearAllWrong, clearWrongOne, getWrong, type WrongEntry } from "@/lib/storage";

export const Route = createFileRoute("/erros")({
  head: () => ({
    meta: [
      { title: "Minhas questões erradas — AZ-104 Practice Exam" },
      {
        name: "description",
        content:
          "Revise as questões AZ-104 que você errou, leia as explicações oficiais, refaça apenas os erros ou remova itens já dominados.",
      },
      { property: "og:title", content: "Minhas questões erradas — AZ-104 Practice Exam" },
      {
        property: "og:description",
        content: "Lista local das questões erradas com explicação e referência Microsoft Learn.",
      },
    ],
  }),
  component: WrongPage,
});

function WrongPage() {
  const bank = useBank();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WrongEntry[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setEntries(getWrong());
  }, []);

  const items = useMemo(
    () =>
      entries
        .map((entry) => ({ entry, question: bank.find((q) => q.id === entry.id) }))
        .filter(
          (item): item is { entry: WrongEntry; question: NonNullable<typeof item.question> } =>
            Boolean(item.question),
        )
        .sort((a, b) => b.entry.misses - a.entry.misses),
    [bank, entries],
  );

  return (
    <AppShell>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter">Minhas questões erradas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} questões salvas localmente. Refaça apenas os erros até dominá-los.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() =>
              void navigate({
                to: "/exam",
                search: {
                  mode: "erros",
                  count: Math.min(items.length, 60),
                  minutes: 0,
                  domains: "",
                  difficulties: "",
                },
              })
            }
            className="rounded bg-primary px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-40"
          >
            Estudar somente erros
          </button>
          {items.length ? (
            <button
              type="button"
              onClick={() => {
                clearAllWrong();
                setEntries([]);
              }}
              className="rounded border border-destructive/40 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive-soft"
            >
              Limpar tudo
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma questão errada registrada. Faça um simulado — os erros aparecem aqui
            automaticamente.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded bg-primary px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
          >
            Ir para o painel
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ entry, question }) => {
            const sq = toSessionQuestion({ ...question, type: question.type });
            const isOpen = open === question.id;
            return (
              <article key={question.id} className="card-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <QuestionMeta sq={sq} />
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {entry.misses}x errada ·{" "}
                      {new Date(entry.lastDate).toLocaleDateString("pt-BR")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : question.id)}
                      className="rounded border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-subtle"
                    >
                      {isOpen ? "Ocultar" : "Revisar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearWrongOne(question.id);
                        setEntries(getWrong());
                      }}
                      className="rounded border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive"
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium">{question.question.split("\n")[0]}</p>
                {isOpen ? (
                  <div className="mt-4">
                    <ul className="space-y-2">
                      {question.options.map((option, index) => (
                        <li
                          key={index}
                          className="rounded border border-border px-3 py-2 text-sm text-muted-foreground"
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                    <AnswerExplanation sq={sq} correct />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
