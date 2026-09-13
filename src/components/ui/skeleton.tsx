import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-slate-800/70", className)} {...props} />;
}
