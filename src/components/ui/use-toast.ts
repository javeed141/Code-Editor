"use client";

import { useEffect, useState } from "react";

type ToastVariant = "default" | "destructive";

export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastInput = Omit<Toast, "id">;

const listeners = new Set<(toasts: Toast[]) => void>();
let memoryToasts: Toast[] = [];

function emit() {
  for (const listener of listeners) {
    listener(memoryToasts);
  }
}

function removeToast(id: string) {
  memoryToasts = memoryToasts.filter((toast) => toast.id !== id);
  emit();
}

function createToast(input: ToastInput) {
  const id = crypto.randomUUID();
  memoryToasts = [...memoryToasts, { ...input, id }];
  emit();

  window.setTimeout(() => removeToast(id), 5000);
  return { id, dismiss: () => removeToast(id) };
}

export const toast = Object.assign(createToast, { add: createToast });

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(memoryToasts);

  useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  return {
    toasts,
    toast,
    dismiss: removeToast,
  };
}
