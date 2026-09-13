import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-16 w-full resize-none rounded-[3px] border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-2 text-xs leading-5 text-[var(--input-fg)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
