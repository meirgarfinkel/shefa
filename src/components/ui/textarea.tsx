import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // base
        "bg-secondary/80 focus:bg-secondary/40 placeholder:text-popover/50 h-20 w-full rounded-md px-3 py-2 text-sm",

        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
