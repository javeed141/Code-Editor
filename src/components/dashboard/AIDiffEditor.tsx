"use client";

import { useEffect, useRef } from "react";
import { DiffEditor, type Monaco } from "@monaco-editor/react";
import { useTheme } from "@/src/context/ThemeContext";
import { defineVsCodeThemes, monacoThemeFor } from "@/src/lib/monacoThemes";
import type { AIPendingEdit } from "@/src/types/editor";

interface AIDiffEditorProps {
  pendingEdit: AIPendingEdit;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Monaco DiffEditor that shows AI-proposed changes inline.
 * Left panel = original content (read-only).
 * Right panel = proposed content (read-only, for review only — user accepts/rejects via toolbar).
 */
export function AIDiffEditor({ pendingEdit, onAccept, onReject }: AIDiffEditorProps) {
  const { theme } = useTheme();
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco) {
      defineVsCodeThemes(monaco);
      monaco.editor.setTheme(monacoThemeFor(theme));
    }
  }, [theme]);

  // Keyboard shortcuts: Escape → reject, Cmd/Ctrl+Enter → accept
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onReject();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onAccept();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onAccept, onReject]);

  return (
    <div className="h-full min-h-[280px] w-full overflow-hidden bg-[var(--editor-bg)]">
      <DiffEditor
        original={pendingEdit.originalContent}
        modified={pendingEdit.proposedContent}
        language={pendingEdit.language}
        theme={monacoThemeFor(theme)}
        beforeMount={(monaco) => {
          defineVsCodeThemes(monaco);
        }}
        onMount={(_editor, monaco) => {
          monacoRef.current = monaco;
          defineVsCodeThemes(monaco);
          monaco.editor.setTheme(monacoThemeFor(theme));
        }}
        options={{
          automaticLayout: true,
          readOnly: true,
          renderSideBySide: true,
          fontSize: 13,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 8, bottom: 8 },
          renderLineHighlight: "line",
          smoothScrolling: true,
          // Highlight inserted/deleted lines with clear colours
          renderIndicators: true,
          ignoreTrimWhitespace: false,
        }}
        loading={
          <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
            Loading diff...
          </div>
        }
      />
    </div>
  );
}
