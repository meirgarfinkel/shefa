import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // base
        "bg-popover/60 flex min-h-20 w-full rounded-md px-3 py-2 text-sm",
        "placeholder:text-muted-foreground",
        "transition-colors duration-150",

        // 🚫 remove ALL rings/outlines
        "outline-none focus:outline-none focus-visible:outline-none",
        "ring-0 focus:ring-0 focus-visible:ring-0",
        "shadow-none focus:shadow-none focus-visible:shadow-none",
        "border-0 focus:border-0 focus-visible:border-0",
        "focus:bg-popover/80",

        // invalid state (clean, no glow)
        "aria-invalid:border-destructive/60",

        // disabled
        "disabled:cursor-not-allowed disabled:opacity-50",

        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
