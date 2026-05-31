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
      variant="light"
      className={`flex items-center gap-1.5 ${className}`}
      {...props} // ← Spread all props (onClick, etc.)
    >
      {children}
      {activeCount !== undefined && activeCount > 0 && (
        <span className="bg-popover ml-auto rounded-full px-1.5 text-xs font-medium text-white/80">
          {activeCount}
        </span>
      )}
      <ChevronDownIcon className="size-3.5" />
    </Button>
  ),
);

FilterTrigger.displayName = "FilterTrigger";
