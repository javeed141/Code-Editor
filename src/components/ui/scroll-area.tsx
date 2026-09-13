import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function ScrollArea({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 overflow-auto", className)} {...props} />;
}
