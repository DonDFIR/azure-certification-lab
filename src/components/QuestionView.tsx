import { useState } from "react";

import { DIFFICULTY_LABEL, domainShort } from "@/lib/domains";
import { correctIndexes, expectedAnswer } from "@/lib/exam";
import type { DragDropConfig, SessionQuestion } from "@/lib/types";

const LETTERS = "ABCDEFGH";

function TypeHint({ type, multi }: { type: SessionQuestion["question"]["type"]; multi?: boolean }) {
  const hint =
    type === "multiple-response"
      ? "Selecione todas as alternativas corretas."
      : type === "ordering"
        ? "Arraste os itens (ou use as setas) para ordená-los na sequência correta."
        : type === "matching"
          ? "Associe cada item da esquerda à opção correspondente."
          : type === "yes-no"
            ? "Responda Sim ou Não."
            : type === "drag-drop"
              ? "Arraste cada item até a categoria correta (ou clique no item e depois na categoria)."
              : type === "hot-area"
                ? multi
                  ? "Selecione todas as áreas/regiões corretas."
                  : "Selecione a área/região correta."
                : "Selecione uma alternativa.";
  return <p className="mt-4 text-xs font-medium text-muted-foreground">{hint}</p>;
}

export function QuestionMeta({ sq }: { sq: SessionQuestion }) {
  const { question } = sq;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] text-muted-foreground">{question.id}</span>
      <span className="rounded border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {domainShort(question.domain)}
      </span>
      <span className="rounded border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {question.topic}
      </span>
      <span className="rounded border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {DIFFICULTY_LABEL[question.difficulty]}
      </span>
    </div>
  );
}

export function QuestionView({
  sq,
  selected,
  reveal,
  onSelect,
}: {
  sq: SessionQuestion;
  selected: number[];
  reveal: boolean;
  onSelect: (next: number[]) => void;
}) {
  const { question } = sq;
  const expected = correctIndexes(question);
  const multi =
    question.type === "multiple-response" ||
    (question.type === "hot-area" && Array.isArray(question.correctAnswer));

  const toggle = (orig: number) => {
    if (reveal) return;
    if (multi) {
      onSelect(
        selected.includes(orig)
          ? selected.filter((value) => value !== orig)
          : [...selected, orig].sort((a, b) => a - b),
      );
    } else {
      onSelect([orig]);
    }
  };

  if (question.type === "ordering") {
    const current = selected.length ? selected : sq.order;
    const move = (index: number, delta: number) => {
      if (reveal) return;
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return;
      const a = next[index] as number;
      const b = next[target] as number;
      next[index] = b;
      next[target] = a;
      onSelect(next);
    };
    const reorderTo = (fromIndex: number, toIndex: number) => {
      if (reveal || fromIndex === toIndex) return;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved as number);
      onSelect(next);
    };
    return (
      <div>
        <QuestionBody sq={sq} />
        <TypeHint type={question.type} />
        <ol className="mt-6 space-y-3">
          {current.map((orig, index) => {
            const ok = reveal && expected[index] === orig;
            return (
              <li
                key={orig}
                draggable={!reveal}
                onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = Number(event.dataTransfer.getData("text/plain"));
                  if (Number.isInteger(from)) reorderTo(from, index);
                }}
                className={`flex items-center gap-4 rounded-lg border p-4 ${reveal ? "" : "cursor-grab active:cursor-grabbing"} ${
                  reveal
                    ? ok
                      ? "border-success bg-success-soft"
                      : "border-destructive bg-destructive-soft"
                    : "border-border bg-surface"
                }`}
              >
                <span className="text-muted-foreground" aria-hidden="true">
                  ⠿
                </span>
                <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
                <span className="flex-1 text-sm">{question.options[orig]}</span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={reveal || index === 0}
                    className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
                    aria-label="Mover para cima"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={reveal || index === current.length - 1}
                    className="rounded border border-border px-2 py-1 text-xs disabled:opacity-40"
                    aria-label="Mover para baixo"
                  >
                    ↓
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  if (question.type === "matching" && question.pairs?.length) {
    const pairs = question.pairs;
    const rights = sq.rightOrder ?? pairs.map((_, i) => i);
    return (
      <div>
        <QuestionBody sq={sq} />
        <TypeHint type={question.type} />
        <div className="mt-6 space-y-3">
          {pairs.map((pair, index) => {
            const value = selected[index];
            const ok = reveal && value === expected[index];
            return (
              <div
                key={pair.left}
                className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center ${
                  reveal
                    ? ok
                      ? "border-success bg-success-soft"
                      : "border-destructive bg-destructive-soft"
                    : "border-border bg-surface"
                }`}
              >
                <span className="flex-1 text-sm font-medium">{pair.left}</span>
                <select
                  className="rounded border border-border bg-background px-3 py-2 text-sm"
                  disabled={reveal}
                  value={value ?? ""}
                  onChange={(event) => {
                    const next = [...selected];
                    while (next.length < pairs.length) next.push(-1);
                    next[index] = Number(event.target.value);
                    onSelect(next);
                  }}
                >
                  <option value="">Selecione…</option>
                  {rights.map((rightIndex) => (
                    <option key={rightIndex} value={rightIndex}>
                      {pairs[rightIndex]?.right}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (question.type === "drag-drop" && question.dragDrop) {
    return (
      <DragDropQuestion
        sq={sq}
        dragDrop={question.dragDrop}
        selected={selected}
        reveal={reveal}
        onSelect={onSelect}
      />
    );
  }

  if (question.type === "hot-area") {
    return (
      <div>
        <QuestionBody sq={sq} />
        <TypeHint type={question.type} multi={multi} />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sq.order.map((orig, index) => {
            const isSelected = selected.includes(orig);
            const isRight = expected.includes(orig);
            const tone = reveal
              ? isRight
                ? "border-success bg-success-soft"
                : isSelected
                  ? "border-destructive bg-destructive-soft"
                  : "border-border bg-surface"
              : isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border bg-surface hover:bg-surface-subtle";
            return (
              <button
                key={orig}
                type="button"
                onClick={() => toggle(orig)}
                aria-pressed={isSelected}
                className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border p-4 text-center transition-colors ${tone}`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center border text-[11px] font-bold ${
                    multi ? "rounded" : "rounded-full"
                  } ${isSelected || (reveal && isRight) ? "border-transparent bg-primary text-primary-foreground" : "border-border-strong text-muted-foreground"}`}
                >
                  {LETTERS[index]}
                </span>
                <span className={`text-xs ${isSelected ? "font-semibold" : "font-medium"}`}>
                  {question.options[orig]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <QuestionBody sq={sq} />
      <TypeHint type={question.type} />
      <div className="mt-6 space-y-3">
        {sq.order.map((orig, index) => {
          const isSelected = selected.includes(orig);
          const isRight = expected.includes(orig);
          const tone = reveal
            ? isRight
              ? "border-success bg-success-soft"
              : isSelected
                ? "border-destructive bg-destructive-soft"
                : "border-border bg-surface"
            : isSelected
              ? "border-primary bg-primary/5"
              : "border-border bg-surface hover:bg-surface-subtle";
          return (
            <button
              key={orig}
              type="button"
              onClick={() => toggle(orig)}
              aria-pressed={isSelected}
              className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors ${tone}`}
            >
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center border text-[11px] font-bold ${
                  multi ? "rounded" : "rounded-full"
                } ${isSelected || (reveal && isRight) ? "border-transparent bg-primary text-primary-foreground" : "border-border-strong text-muted-foreground"}`}
              >
                {LETTERS[index]}
              </span>
              <span className={`text-sm ${isSelected ? "font-semibold" : "font-medium"}`}>
                {question.options[orig]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuestionBody({ sq }: { sq: SessionQuestion }) {
  const paragraphs = sq.question.question.split("\n").filter(Boolean);
  return (
    <div className="max-w-[75ch] space-y-3">
      {paragraphs.map((text, index) => (
        <p
          key={index}
          className={
            index === 0
              ? "text-lg font-semibold leading-snug tracking-tight"
              : "text-sm leading-relaxed text-muted-foreground"
          }
        >
          {text}
        </p>
      ))}
    </div>
  );
}

/** Área de origem + categorias de destino para type = "drag-drop". Suporta drag nativo e clique. */
function DragDropQuestion({
  sq,
  dragDrop,
  selected,
  reveal,
  onSelect,
}: {
  sq: SessionQuestion;
  dragDrop: DragDropConfig;
  selected: number[];
  reveal: boolean;
  onSelect: (next: number[]) => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const placement = dragDrop.items.map((_, i) => selected[i] ?? -1);
  const expected = expectedAnswer(sq.question);

  const place = (itemIndex: number, categoryIndex: number) => {
    if (reveal) return;
    const next = [...placement];
    next[itemIndex] = categoryIndex;
    onSelect(next);
    setActive(null);
  };

  const unplace = (itemIndex: number) => {
    if (reveal) return;
    const next = [...placement];
    next[itemIndex] = -1;
    onSelect(next);
  };

  return (
    <div>
      <QuestionBody sq={sq} />
      <TypeHint type="drag-drop" />
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="label-caps mb-3">Itens</p>
          <div className="space-y-2">
            {sq.order
              .filter((itemIndex) => placement[itemIndex] === -1)
              .map((itemIndex) => {
                const item = dragDrop.items[itemIndex]!;
                return (
                  <div
                    key={item.id}
                    draggable={!reveal}
                    onDragStart={(event) =>
                      event.dataTransfer.setData("text/plain", String(itemIndex))
                    }
                    onClick={() => !reveal && setActive(active === itemIndex ? null : itemIndex)}
                    role="button"
                    tabIndex={0}
                    className={`cursor-pointer rounded-lg border p-3 text-sm transition-colors ${
                      active === itemIndex
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-surface hover:bg-surface-subtle"
                    }`}
                  >
                    {item.label}
                  </div>
                );
              })}
            {sq.order.every((itemIndex) => placement[itemIndex] !== -1) ? (
              <p className="text-xs text-muted-foreground">Todos os itens foram posicionados.</p>
            ) : null}
          </div>
          {!reveal ? (
            <button
              type="button"
              onClick={() => onSelect([])}
              className="mt-4 rounded border border-border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-surface-subtle"
            >
              ↺ Reiniciar resposta
            </button>
          ) : null}
        </div>

        <div>
          <p className="label-caps mb-3">Categorias</p>
          <div className="space-y-3">
            {dragDrop.categories.map((category, categoryIndex) => {
              const itemsHere = dragDrop.items
                .map((item, i) => ({ item, i }))
                .filter(({ i }) => placement[i] === categoryIndex);
              return (
                <div
                  key={category}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = Number(event.dataTransfer.getData("text/plain"));
                    if (Number.isInteger(from)) place(from, categoryIndex);
                  }}
                  onClick={() => active !== null && place(active, categoryIndex)}
                  className="min-h-16 rounded-lg border-2 border-dashed border-border-strong bg-surface-subtle p-3"
                >
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {category}
                  </p>
                  {itemsHere.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Área de destino</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {itemsHere.map(({ item, i }) => {
                        const ok = reveal && expected[i] === categoryIndex;
                        const wrong = reveal && expected[i] !== categoryIndex;
                        return (
                          <span
                            key={item.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              unplace(i);
                            }}
                            className={`cursor-pointer rounded border px-2 py-1 text-xs ${
                              reveal
                                ? ok
                                  ? "border-success bg-success-soft"
                                  : "border-destructive bg-destructive-soft"
                                : "border-primary bg-primary/10"
                            }`}
                          >
                            {item.label}
                            {wrong ? " ✕" : null}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnswerExplanation({ sq, correct }: { sq: SessionQuestion; correct: boolean }) {
  const { question } = sq;
  const expected = correctIndexes(question);
  const answerText =
    question.type === "ordering"
      ? expected.map((i, pos) => `${pos + 1}. ${question.options[i]}`).join(" · ")
      : question.type === "matching" && question.pairs
        ? question.pairs.map((p) => `${p.left} → ${p.right}`).join(" · ")
        : question.type === "drag-drop" && question.dragDrop
          ? question.dragDrop.items
              .map(
                (item) => `${item.label} → ${question.dragDrop!.categories[item.correctCategory]}`,
              )
              .join(" · ")
          : question.type === "lab-simulation"
            ? "Ver detalhamento por tarefa acima."
            : expected.map((i) => question.options[i]).join(" | ");

  return (
    <div
      className={`mt-8 rounded-lg border p-5 ${correct ? "border-success bg-success-soft" : "border-destructive bg-destructive-soft"}`}
    >
      <p className="label-caps">{correct ? "Resposta correta" : "Resposta incorreta"}</p>
      <p className="mt-2 text-sm font-semibold">{answerText}</p>
      <p className="mt-3 text-sm leading-relaxed">{question.explanation}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">Referência: {question.reference}</span>
        {question.referenceUrl ? (
          <a
            href={question.referenceUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded border border-border bg-surface px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary transition-colors hover:bg-surface-subtle"
          >
            Ver referência
          </a>
        ) : null}
      </div>
    </div>
  );
}
