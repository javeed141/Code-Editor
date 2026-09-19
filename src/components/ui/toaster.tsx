"use client";

import { X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useToast } from "@/src/components/ui/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-8 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`rounded-md border p-4 text-sm shadow-lg ${
            toast.variant === "destructive"
              ? "border-red-500/40 bg-red-950 text-red-100"
              : "border-emerald-500/40 bg-emerald-950 text-emerald-100"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              {toast.title && <p className="font-semibold">{toast.title}</p>}
              {toast.description && (
                <p className="mt-1 text-xs opacity-90">{toast.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="size-5 shrink-0 text-current hover:bg-white/10"
            >
              <X aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
