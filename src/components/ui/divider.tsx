import { cn } from "@/lib/utils";

export function Divider({ className }: { className?: string }) {
  return <div className={cn("bg-border my-6 h-px", className)} />;
}
