import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn("bg-surface-1 relative rounded-lg p-4", className)}>
      <div className="pointer-events-none absolute inset-0 rounded-lg bg-linear-to-b from-white/7 via-transparent to-transparent" />
      <p className="text-text-muted text-xs">{label}</p>
      <p className="text-text mt-1 text-xl font-medium">{value}</p>
    </div>
  );
}
