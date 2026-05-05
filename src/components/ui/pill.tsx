import { cn } from "@/lib/utils";

type PillProps = React.ComponentProps<"span"> & {
  variant?: "default" | "dark" | "success" | "warning" | "danger";
};

export function Pill({ className, variant = "default", ...props }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        // base
        "bg-primary/15 rounded-full bg-linear-to-b from-white/10 via-transparent to-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap shadow-xl",

        // variants
        variant === "dark" && "bg-surface-1/60",
        variant === "success" && "bg-success/50",
        variant === "warning" && "bg-warning/50",
        variant === "danger" && "bg-danger/50",

        className,
      )}
      {...props}
    />
  );
}
