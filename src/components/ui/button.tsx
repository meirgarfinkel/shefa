import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center cursor-pointer shadow-lg hover:shadow-none rounded-md text-sm font-medium transition-colors duration-100 outline-none select-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary hover:bg-popover/90 hover:text-white from-popover/20 bg-linear-to-t via-transparent to-transparent",
        secondary:
          "bg-secondary/40 text-popover hover:bg-secondary/80 hover:text-popover from-popover/20 bg-linear-to-t via-transparent to-transparent",
        ghost:
          "bg-white/20 hover:bg-white/60 from-popover/20 bg-linear-to-t via-transparent to-transparent",
        destructive:
          "bg-white/80 text-danger hover:bg-white/90 hover:from-orange/10 from-primary/40 bg-linear-to-t via-transparent to-transparent",
        link: "underline-offset-4 hover:underline",
        light:
          "from-primary/40 bg-white/70 bg-linear-to-t via-transparent to-transparent hover:bg-white hover:from-orange/10",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2 text-xs",
        lg: "h-9 px-4",
        icon: "size-8",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
