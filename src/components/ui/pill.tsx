import { cn } from "@/lib/utils";

type PillProps = React.ComponentProps<"span"> & {
  variant?: "default" | "dark" | "success" | "warning" | "danger" | "light";
  size?: "default" | "sm";
};

export function Pill({ className, variant = "default", size = "default", ...props }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        // base
        "bg-secondary/60 text-popover rounded-full border border-white font-medium whitespace-nowrap shadow-[-2px_2px_3px_#00000033,inset_1px_-1px_5px_#ffffff66,inset_-2px_2px_6px_#ffffff]",

        // size
        size === "default" && "px-3 py-1.5 text-sm",
        size === "sm" && "px-2 py-0.5 text-xs",

        // variants
        variant === "dark" && "bg-card/60",
        variant === "success" && "bg-success/50",
        variant === "warning" && "bg-warning/70",
        variant === "danger" && "bg-danger/50",
        variant === "light" &&
          "text-popover bg-card/10 border border-white shadow-[-3px_3px_6px_#00000033,inset_1px_-1px_5px_#ffffff66,inset_-6px_4px_6px_#ffffff]",

        className,
      )}
      {...props}
    />
  );
}
