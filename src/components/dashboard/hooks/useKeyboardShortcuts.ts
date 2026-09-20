import { useEffect } from "react";

interface UseKeyboardShortcutsProps {
  onOpenCommand: () => void;
  onSave: () => void;
}

export function useKeyboardShortcuts({ onOpenCommand, onSave }: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenCommand();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenCommand, onSave]);
}

