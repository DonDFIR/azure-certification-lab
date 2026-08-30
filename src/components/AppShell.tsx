import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { getTheme, setTheme, type Theme } from "@/lib/storage";

const NAV = [
  { to: "/", label: "Painel" },
  { to: "/historico", label: "Histórico" },
  { to: "/erros", label: "Meus erros" },
  { to: "/banco", label: "Banco de Questões" },
] as const;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const stored = getTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        const next: Theme = theme === "dark" ? "light" : "dark";
        setThemeState(next);
        setTheme(next);
        applyTheme(next);
      }}
      className="rounded border border-border px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Alternar tema claro e escuro"
    >
      {theme === "dark" ? "Claro" : "Escuro"}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
              AZ
            </span>
            <span className="text-sm font-semibold tracking-tight">
              AZ-104 Practice Exam
              <span className="ml-2 hidden text-[10px] font-normal uppercase tracking-widest text-muted-foreground sm:inline">
                Local
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            {NAV.slice(1).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-xs font-medium text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</main>

      <footer className="mt-20 border-t border-border bg-surface-subtle py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>AZ-104 Practice Exam • Questões originais baseadas em conteúdo oficial</span>
          <span className="normal-case tracking-normal">
            Não afiliado à Microsoft. Não contém questões reais de exame.
          </span>
        </div>
      </footer>
    </div>
  );
}
