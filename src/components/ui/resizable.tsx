"use client";

import { useCallback, type HTMLAttributes } from "react";
import { cn } from "@/src/lib/cn";

export function ResizablePanelGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-h-0 min-w-0 w-full h-full", className)} {...props} />;
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
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    const prev = handle.previousElementSibling as HTMLElement | null;
    const next = handle.nextElementSibling as HTMLElement | null;
    if (!prev || !next) return;

    const startX = e.clientX;
    const prevWidth = prev.getBoundingClientRect().width;
    const nextWidth = next.getBoundingClientRect().width;
    const totalWidth = prevWidth + nextWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newPrevWidth = Math.max(120, prevWidth + deltaX);
      const newNextWidth = Math.max(120, nextWidth - deltaX);

      const prevPercent = (newPrevWidth / totalWidth) * 100;
      const nextPercent = (newNextWidth / totalWidth) * 100;

      prev.style.flex = `${prevPercent} 1 0%`;
      next.style.flex = `${nextPercent} 1 0%`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onMouseDown={handleMouseDown}
      className={cn(
        "group relative w-[4px] -mx-[1px] z-20 shrink-0 cursor-col-resize transition-colors hover:bg-cyan-400 active:bg-cyan-500",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
    </div>
  );
}
