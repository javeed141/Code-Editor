"use client";

import Editor from "@monaco-editor/react";
import { useTheme } from "@/src/context/ThemeContext";

type CodeEditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
};

export default function CodeEditor({ value, language, onChange }: CodeEditorProps) {
  const { theme } = useTheme();

  return (
    <div className="h-full min-h-[280px] w-full overflow-hidden bg-[var(--editor-bg)]">
      <Editor
        theme={theme === "dark" ? "vs-dark" : "vs"}
        language={language}
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        options={{
          automaticLayout: true,
          minimap: { enabled: true },
          fontSize: 13,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
          wordWrap: "off",
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: "line",
          smoothScrolling: true,
          tabSize: 2,
        }}
        loading={
          <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
