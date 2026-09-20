"use client";

import { useEffect, useRef } from "react";

type DiffViewerProps = {
  original: string;
  modified: string;
  language: string;
};

/**
 * Renders a Monaco side-by-side diff editor (read-only).
 * Red lines = removed, green lines = added — exactly like GitHub's split diff view.
 */
export default function DiffViewer({ original, modified, language }: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let disposed = false;
    let diffEditor: { dispose: () => void; setModel: (m: unknown) => void } | null = null;

    async function init() {
      try {
        const monaco = await import("@monaco-editor/react").then((m) => m.loader.init());
        if (disposed || !containerRef.current) return;

        diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
          readOnly: true,
          renderSideBySide: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          lineNumbers: "on",
          wordWrap: "on",
          theme: document.documentElement.dataset.theme === "light" ? "vs" : "vs-dark",
          scrollbar: { vertical: "auto", horizontal: "auto" },
        }) as { dispose: () => void; setModel: (m: unknown) => void };

        const originalModel = monaco.editor.createModel(original, language);
        const modifiedModel = monaco.editor.createModel(modified, language);
        diffEditor.setModel({ original: originalModel, modified: modifiedModel });
      } catch {
        // Monaco may fail in SSR — ignore
      }
    }

    init();
    return () => {
      disposed = true;
      if (diffEditor) diffEditor.dispose();
    };
  }, [original, modified, language]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-0 w-full overflow-hidden rounded-[3px] border border-[var(--border-color)] bg-[var(--editor-bg)]"
    />
  );
}

