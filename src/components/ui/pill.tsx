import { cn } from "@/lib/utils";

type PillProps = React.ComponentProps<"span"> & {
  variant?: "default" | "primary" | "success" | "warning" | "danger";
};

export function Pill({ className, variant = "default", ...props }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        // base
        "inline-flex items-center rounded-full px-2.5 py-2 text-xs font-medium",
        "transition-colors duration-150",

        // default (subtle)
        "bg-primary/15 text-text",

        // variants
        variant === "primary" && "bg-primary/15 text-primary",
        variant === "success" && "bg-success/15 text-success",
        variant === "warning" && "bg-warning/15 text-warning",
        variant === "danger" && "bg-danger/15 text-danger",

        className,
      )}
      {...props}
    />
  );
}
