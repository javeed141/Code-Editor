"use client";

import Editor from "@monaco-editor/react";

type CodeEditorProps = {
  value: string;
  language: string;
  onChange: (value: string) => void;
};

export default function CodeEditor({ value, language, onChange }: CodeEditorProps) {
  return (
    <div className="h-full min-h-[360px] w-full overflow-hidden bg-[#0d0f12]">
      <Editor
        theme="vs-dark"
        language={language}
        value={value}
        onChange={(nextValue) => onChange(nextValue ?? "")}
        options={{
          automaticLayout: true,
          minimap: { enabled: true },
          fontSize: 14,
          fontFamily: "var(--font-geist-mono), monospace",
          wordWrap: "off",
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: "line",
          smoothScrolling: true,
          tabSize: 2,
        }}
        loading={
          <div className="flex h-full items-center justify-center text-xs text-slate-500">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
