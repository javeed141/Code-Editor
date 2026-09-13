"use client";

import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/src/lib/cn";

type TabsContextValue = { value: string; setValue: (value: string) => void };
const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function Tabs({ defaultValue = "", value: controlledValue, onValueChange, className, children, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const setValue = (nextValue: string) => {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)} {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex items-center rounded-md bg-slate-900/70 p-0.5", className)} {...props} />;
}

type TabsTriggerProps = HTMLAttributes<HTMLButtonElement> & { value: string };

export function TabsTrigger({ className, value, children, ...props }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  const active = context?.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => context?.setValue(value)}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-[11px] text-slate-500 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400/70",
        active && "bg-[#1b2430] text-slate-100 shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ className, value, children, ...props }: HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = useContext(TabsContext);
  if (context?.value !== value) return null;
  return <div className={cn("mt-2", className)} {...props}>{children}</div>;
}

export type { ReactNode };
