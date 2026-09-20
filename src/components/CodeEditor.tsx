"use client";

import { useEffect, useRef } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { useTheme } from "@/src/context/ThemeContext";
import { defineVsCodeThemes, monacoThemeFor } from "@/src/lib/monacoThemes";

type CodeEditorProps = {
  value: string;
  language: string;
  path?: string;
  onChange: (value: string) => void;
};

export default function CodeEditor({ value, language, path, onChange }: CodeEditorProps) {
  const { theme } = useTheme();
  const monacoRef = useRef<Monaco | null>(null);

  // `theme` can be requested by the Editor before Monaco has registered our
  // custom definitions. Set it again after mount and on every selector change.
  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco) {
      defineVsCodeThemes(monaco);
      monaco.editor.setTheme(monacoThemeFor(theme));
    }
  }, [theme]);

  function handleBeforeMount(monaco: Monaco) {
    defineVsCodeThemes(monaco);
    // Configure TypeScript to support TSX/JSX syntax properly
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      allowJs: true,
      esModuleInterop: true,
      isolatedModules: true,
    });

    // Disable semantic module resolution errors in the browser (e.g., Cannot find module 'react')
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    // Configure JavaScript compiler & diagnostics
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      allowJs: true,
      esModuleInterop: true,
    });

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
  }

  return (
    <div className="h-full min-h-[280px] w-full overflow-hidden bg-[var(--editor-bg)]">
      <Editor
        path={path}
        theme={monacoThemeFor(theme)}
        language={language}
        value={value}
        beforeMount={handleBeforeMount}
        onMount={(_editor, monaco) => {
          monacoRef.current = monaco;
          defineVsCodeThemes(monaco);
          monaco.editor.setTheme(monacoThemeFor(theme));
        }}
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
