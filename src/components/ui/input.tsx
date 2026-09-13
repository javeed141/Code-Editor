import type { InputHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function Input({ className, type = "text", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-8 w-full rounded-md border border-slate-700/80 bg-[#0d1117] px-2.5 text-xs text-slate-200 outline-none transition-colors placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
