import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[var(--radius-control)] border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[var(--line)] bg-[var(--muted)] text-[var(--ink-700)]",
        neutral: "border-[var(--line)] bg-[var(--muted)] text-[var(--ink-700)]",
        info: "border-[var(--blue-600)] bg-[var(--blue-50)] text-[var(--blue-700)]",
        success: "border-[var(--green-600)] bg-[var(--surface)] text-[var(--green-600)]",
        warning: "border-[var(--amber-600)] bg-[var(--surface)] text-[var(--amber-600)]",
        danger: "border-[var(--red-600)] bg-[var(--surface)] text-[var(--red-600)]",
        violet: "border-[var(--violet-600)] bg-[var(--violet-50)] text-[var(--violet-600)]",
        secondary:
          "border-[var(--line)] bg-[var(--muted)] text-[var(--ink-700)]",
        destructive:
          "border-[var(--red-600)] bg-[var(--red-600)] text-white",
        outline: "border-[var(--line-2)] text-[var(--ink-700)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
