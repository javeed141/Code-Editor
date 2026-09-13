import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function Avatar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300", className)}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("flex size-full items-center justify-center", className)} {...props} />;
}
