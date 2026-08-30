import { scoreTone } from "@/lib/exam";

const TONE_CLASS = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
} as const;

export function Bar({ percent, className = "h-1.5" }: { percent: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${TONE_CLASS[scoreTone(clamped)]}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function NeutralBar({
  percent,
  className = "h-1.5",
}: {
  percent: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={`w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
