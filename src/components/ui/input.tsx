import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // base
        "bg-popover/60 flex h-9 w-full min-w-0 rounded-md px-3 py-1 text-sm",
        "placeholder:text-muted-foreground transition-colors duration-150",

        // 🚫 kill ALL focus visuals (critical)
        "outline-none focus:outline-none focus-visible:outline-none",
        "ring-0 focus:ring-0 focus-visible:ring-0",
        "shadow-none focus:shadow-none focus-visible:shadow-none",
        "border-0 focus:border-0 focus-visible:border-0",
        "focus:bg-popover/80",

        // invalid state
        "aria-invalid:border-destructive/60 aria-invalid:ring-destructive/20 aria-invalid:ring-1",

        // disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",

        // file input styling
        "file:text-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",

        className,
      )}
      {...props}
    />
  );
}

export { Input };
