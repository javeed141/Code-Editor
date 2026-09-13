import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-16 w-full resize-none rounded-md border border-slate-700/80 bg-[#0d1117] px-2.5 py-2 text-xs leading-5 text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
