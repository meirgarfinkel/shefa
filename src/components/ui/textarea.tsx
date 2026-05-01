import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 bg-muted flex field-sizing-content min-h-16 w-full rounded-md border px-2.5 py-2 text-base transition-colors duration-150 outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
