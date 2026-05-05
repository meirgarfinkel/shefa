import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

const inputVariants = cva(
  "flex h-8 w-full min-w-0 rounded-md px-3 py-1 text-sm bg-linear-to-b from-white/15 via-transparent to-transparent placeholder:text-text-muted transition-colors duration-150 aria-invalid:border-danger/60 aria-invalid:ring-danger/20 aria-invalid:ring-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-surface-3 text-text hover:bg-surface-2 focus:bg-surface-1",
        light: "bg-secondary hover:bg-secondary/40 focus:bg-secondary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Input({
  className,
  type,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "input";

  return (
    <Comp
      data-slot="input"
      data-variant={variant}
      data-type={type}
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  );
}

export { Input, inputVariants };
