import type { SelectHTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-8 rounded-md border border-slate-700/80 bg-[#0d1117] px-2 text-xs text-slate-300 outline-none transition-colors focus:border-blue-400/60 focus:ring-1 focus:ring-blue-400/20",
        className,
      )}
      {...props}
    />
  );
}
