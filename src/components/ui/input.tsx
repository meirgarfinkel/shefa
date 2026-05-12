import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";

const inputVariants = cva(
  "flex h-8 w-full rounded-md px-3 py-1 text-sm transition-colors duration-100 aria-invalid:border-danger/60 aria-invalid:ring-danger/20 aria-invalid:ring-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-popover hover:bg-dark/85 focus:bg-popover placeholder:text-gray-light-1 text-gray-light-1",
        light: "bg-popover hover:bg-card/40 focus:bg-card/20",
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
