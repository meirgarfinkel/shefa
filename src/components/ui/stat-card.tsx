import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-primary flex items-center justify-between rounded-md border bg-linear-to-b from-white/60 via-transparent to-transparent p-4 font-medium",
        className,
      )}
    >
      <p className="text-muted-foreground">{label}</p>
      <p className="text-popover text-xl">{value}</p>
    </div>
  );
}
