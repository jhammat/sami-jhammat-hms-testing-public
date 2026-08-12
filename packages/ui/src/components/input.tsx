import * as React from "react";

import { cn } from "../lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "flex h-[34px] w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--line-2)] bg-[var(--surface)] px-3 text-sm text-[var(--ink-900)] transition-colors placeholder:text-[var(--ink-400)] disabled:pointer-events-none disabled:text-[var(--ink-400)]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
