import type { SessionQuestion } from "@/lib/types";

export function LabSimulationView({
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
  const lab = question.labConfig;
  if (!lab) return null;

  const current = lab.tasks.map((_, i) => selected[i] ?? -1);
  const answeredTasks = current.filter((value) => value >= 0).length;

  const setTask = (taskIndex: number, optionIndex: number) => {
    if (reveal) return;
    const next = [...current];
    next[taskIndex] = optionIndex;
    onSelect(next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-background">
          Lab Simulation
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {answeredTasks}/{lab.tasks.length} tarefas respondidas
        </span>
      </div>

      <p className="mt-4 max-w-[75ch] text-sm leading-relaxed text-muted-foreground">
        {lab.scenario}
      </p>

      <div className="mt-4 rounded-lg border border-border bg-surface-subtle p-4">
        <p className="label-caps mb-2">Requisitos</p>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {lab.requirements.map((req, index) => (
            <li key={index} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{req}</span>
            </li>
          ))}
        </ul>
      </div>

      <ol className="mt-6 space-y-4">
        {lab.tasks.map((task, taskIndex) => {
          const value = current[taskIndex];
          const ok = reveal && value === task.correctOption;
          const answered = value !== undefined && value >= 0;
          return (
            <li
              key={task.id}
              className={`rounded-lg border p-4 ${
                reveal
                  ? ok
                    ? "border-success bg-success-soft"
                    : "border-destructive bg-destructive-soft"
                  : "border-border bg-surface"
              }`}
            >
              <p className="text-sm font-semibold">
                Tarefa {taskIndex + 1}: {task.label}
              </p>
              <select
                className="mt-3 w-full rounded border border-border bg-background px-3 py-2 text-sm disabled:opacity-70"
                disabled={reveal}
                value={answered ? value : ""}
                onChange={(event) => setTask(taskIndex, Number(event.target.value))}
              >
                <option value="" disabled>
                  Selecione uma opção…
                </option>
                {task.options.map((option, optionIndex) => (
                  <option key={optionIndex} value={optionIndex}>
                    {option}
                  </option>
                ))}
              </select>
              {reveal ? (
                <p className="mt-2 text-xs font-medium">
                  {ok ? "Correto" : `Esperado: ${task.options[task.correctOption]}`}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      {reveal ? (
        <div className="mt-6 rounded-lg border border-border bg-surface-subtle p-5">
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
      ) : null}
    </div>
  );
}
