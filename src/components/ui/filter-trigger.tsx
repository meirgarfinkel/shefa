import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "lucide-react";
import { forwardRef, type ReactNode, type ButtonHTMLAttributes } from "react";

interface FilterTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  activeCount?: number;
}

export const FilterTrigger = forwardRef<HTMLButtonElement, FilterTriggerProps>(
  ({ children, activeCount, className = "", ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      className={`bg-primary/20 hover:bg-primary/30 flex h-8 items-center gap-1.5 rounded-md px-3 text-sm shadow-lg ${className}`}
      {...props} // ← Spread all props (onClick, etc.)
    >
      {children}
      {activeCount !== undefined && activeCount > 0 && (
        <span className="bg-primary/30 ml-1 rounded-full px-1.5 text-xs">{activeCount}</span>
      )}
      <ChevronDownIcon className="size-3.5" />
    </Button>
  ),
);

FilterTrigger.displayName = "FilterTrigger";
