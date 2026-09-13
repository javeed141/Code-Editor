import type { InputHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function Input({ className, type = "text", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-7 w-full rounded-[2px] border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 text-xs text-[var(--input-fg)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
