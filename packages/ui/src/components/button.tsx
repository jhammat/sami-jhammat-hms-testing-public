import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex h-[34px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] border text-sm font-medium transition-[color,background-color,border-color] duration-100 disabled:pointer-events-none disabled:text-[var(--ink-400)] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-[var(--blue-600)] bg-[var(--blue-600)] text-white hover:border-[var(--blue-700)] hover:bg-[var(--blue-700)]",
        default: "border-[var(--blue-600)] bg-[var(--blue-600)] text-white hover:border-[var(--blue-700)] hover:bg-[var(--blue-700)]",
        destructive:
          "border-[var(--red-600)] bg-[var(--red-600)] text-white",
        danger:
          "border-[var(--red-600)] bg-[var(--red-600)] text-white",
        outline:
          "border-[var(--line-2)] bg-[var(--surface)] text-[var(--ink-700)] hover:bg-[var(--muted)]",
        secondary:
          "border-[var(--line-2)] bg-[var(--surface)] text-[var(--ink-700)] hover:bg-[var(--muted)]",
        ghost: "border-transparent bg-transparent text-[var(--ink-700)] hover:bg-[var(--muted)]",
        link: "border-transparent text-[var(--blue-600)] underline-offset-4 hover:underline",
      },
      size: {
        default: "px-4",
        md: "px-4",
        sm: "h-8 px-3 text-xs",
        lg: "px-4",
        icon: "w-[34px] px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
