import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "bg-secondary/40 focus:bg-secondary/40 placeholder:text-popover/50 h-15 w-full rounded-md px-3 py-2 text-sm shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
