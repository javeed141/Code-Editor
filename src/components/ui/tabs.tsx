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

export function TabsList({ className, onWheel, ...props }: HTMLAttributes<HTMLDivElement>) {
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
    onWheel?.(e);
  };

  return (
    <div
      onWheel={handleWheel}
      className={cn(
        "inline-flex items-stretch overflow-x-auto no-scrollbar bg-[var(--tabbar-bg)]",
        className,
      )}
      {...props}
    />
  );
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
        "group relative inline-flex h-9 items-center gap-2 border-r border-[var(--border-color)] px-3 text-xs transition-colors cursor-pointer select-none",
        active
          ? "bg-[var(--tab-active-bg)] text-[var(--tab-active-fg)] font-medium border-b-2 border-b-[#007acc]"
          : "bg-[var(--tab-inactive-bg)] text-[var(--tab-inactive-fg)] hover:bg-[var(--tab-active-bg)]/40 hover:text-[var(--foreground)]",
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
  return <div className={cn("mt-0", className)} {...props}>{children}</div>;
}

export type { ReactNode };
