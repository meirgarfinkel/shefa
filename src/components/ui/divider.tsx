import { cn } from "@/lib/utils";

export function Divider({ className }: { className?: string }) {
  return <div className={cn("bg-background my-6 h-px", className)} />;
}
