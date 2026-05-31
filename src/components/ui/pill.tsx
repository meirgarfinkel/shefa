import { cn } from "@/lib/utils";

type PillProps = React.ComponentProps<"span"> & {
  variant?: "default" | "dark" | "success" | "warning" | "danger" | "light";
};

export function Pill({ className, variant = "default", ...props }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        // base
        "bg-secondary/60 text-popover rounded-full bg-linear-to-b from-white/10 via-transparent to-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap shadow-xl",

        // variants
        variant === "dark" && "bg-card/60",
        variant === "success" && "bg-success/50",
        variant === "warning" && "bg-warning/70",
        variant === "danger" && "bg-danger/50",
        variant === "light" &&
          "text-popover from-primary/40 bg-white/80 bg-linear-to-t via-transparent to-transparent",

        className,
      )}
      {...props}
    />
  );
}
