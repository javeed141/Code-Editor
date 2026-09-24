import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("min-h-0 overflow-auto", className)} {...props} />;
  }
);
ScrollArea.displayName = "ScrollArea";
