import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-[3px] bg-[rgba(128,128,128,0.2)]", className)} {...props} />;
}
