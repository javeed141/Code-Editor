"use client";

import { useEffect, type HTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/src/lib/cn";
import { Button } from "@/src/components/ui/button";

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode };

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-[1px] p-4 pt-[12vh]" onMouseDown={() => onOpenChange(false)}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md" onMouseDown={(event) => event.stopPropagation()}>{children}</div>
    </div>
  );
}

export function DialogContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-md border border-[var(--border-color)] bg-[var(--card-bg)] p-4 text-[var(--foreground)] shadow-2xl", className)} {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-3 space-y-1", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-sm font-semibold text-[var(--foreground)]", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs leading-5 text-[var(--text-muted)]", className)} {...props} />;
}

export function DialogClose({ onClick, ...props }: React.ComponentProps<typeof Button>) {
  return <Button variant="ghost" size="icon" aria-label="Close dialog" onClick={onClick} {...props}><X className="size-4" /></Button>;
}
