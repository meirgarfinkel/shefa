import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "glass glass-hover hover:scale-98 active:scale-96 inline-flex shrink-0 items-center text-nowrap justify-center cursor-pointer transition-transform ease-out duration-150 rounded-lg font-medium outline-none select-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary/30",
        secondary: "bg-secondary/40",
        ghost: "bg-transparent",
        destructive: "bg-danger/10 text-danger",
        success: "bg-message-green/10 text-message-green",
        link: "underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-5",
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
