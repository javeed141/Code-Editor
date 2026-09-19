"use client";

import { createContext, useContext, useEffect, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/src/lib/cn";

type AlertDialogContextValue = { onOpenChange: (open: boolean) => void };
const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

type AlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
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
    <AlertDialogContext.Provider value={{ onOpenChange }}>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
        {children}
      </div>
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className={cn(
        "w-full max-w-md rounded-md border border-[var(--border-color)] bg-[var(--card-bg)] p-5 text-[var(--foreground)] shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

export function AlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5", className)} {...props} />;
}

export function AlertDialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs leading-5 text-[var(--text-muted)]", className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-5 flex justify-end gap-2", className)} {...props} />;
}

export function AlertDialogCancel({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useContext(AlertDialogContext);
  return <button type="button" onClick={() => context?.onOpenChange(false)} className={className} {...props} />;
}
