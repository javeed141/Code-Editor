import type { HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function ResizablePanelGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-h-0 min-w-0", className)} {...props} />;
}

type ResizablePanelProps = HTMLAttributes<HTMLDivElement> & { defaultSize?: number; minSize?: number };

export function ResizablePanel({ className, defaultSize, minSize, style, ...props }: ResizablePanelProps) {
  return (
    <div
      className={cn("flex min-h-0 min-w-0 flex-col", className)}
      style={{ ...style, flex: `${defaultSize ?? 100} 1 0%`, minWidth: minSize ? `${minSize}%` : undefined }}
      {...props}
    />
  );
}

export function ResizableHandle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" aria-orientation="vertical" className={cn("w-px shrink-0 cursor-col-resize bg-slate-800/80 transition-colors hover:bg-cyan-400/50", className)} {...props} />;
}
