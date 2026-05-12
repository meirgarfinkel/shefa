import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn("bg-popover relative rounded-md p-4", className)}>
      <div className="pointer-events-none absolute inset-0 rounded-md bg-linear-to-b from-white/7 via-transparent to-transparent" />
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-popover-foreground mt-1 text-xl font-medium">{value}</p>
    </div>
  );
}
