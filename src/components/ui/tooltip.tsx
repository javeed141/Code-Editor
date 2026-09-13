"use client";

import type { ReactNode } from "react";

type TooltipProps = {
  label: string;
  children: ReactNode;
};

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
