import type { SelectHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-7 rounded-[2px] border border-[var(--input-border)] bg-[var(--input-bg)] px-2 text-xs text-[var(--input-fg)] outline-none transition-colors focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}
