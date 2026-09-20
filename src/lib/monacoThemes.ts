import type { Monaco } from "@monaco-editor/react";
import { themeIds, vscodeThemes, type ThemeId } from "@/src/lib/vscodeThemes";

export const monacoThemeFor = (theme: ThemeId) => `vscode-${theme}`;

/**
 * Registers all ten themes contributed by VS Code's theme-defaults extension.
 * Workspace values come from the corresponding source theme's UI color tokens.
 */
export function defineVsCodeThemes(monaco: Monaco) {
  themeIds.forEach((themeId) => {
    const theme = vscodeThemes[themeId];
    const colors = theme.workspace;
    const darkRules = [
      { token: "comment", foreground: "6A9955" },
      { token: "keyword", foreground: "C586C0" },
      { token: "string", foreground: "CE9178" },
      { token: "number", foreground: "B5CEA8" },
      { token: "type", foreground: "4EC9B0" },
      { token: "function", foreground: "DCDCAA" },
      { token: "variable", foreground: "9CDCFE" },
    ];
    const lightRules = [
      { token: "comment", foreground: "008000" },
      { token: "keyword", foreground: "AF00DB" },
      { token: "string", foreground: "A31515" },
      { token: "number", foreground: "098658" },
      { token: "type", foreground: "267F99" },
      { token: "function", foreground: "795E26" },
      { token: "variable", foreground: "001080" },
    ];

    monaco.editor.defineTheme(monacoThemeFor(themeId), {
      base: theme.monacoBase,
      inherit: true,
      colors: {
        "editor.background": colors["--editor-bg"],
        "editor.foreground": colors["--foreground"],
        "editorGutter.background": colors["--editor-bg"],
        "editorLineNumber.foreground": colors["--text-muted"],
        "editorLineNumber.activeForeground": colors["--foreground"],
        "editor.selectionBackground": colors["--selection"],
        "editor.inactiveSelectionBackground": colors["--list-active"],
        "editor.lineHighlightBackground": colors["--list-hover"],
        "editorCursor.foreground": colors["--foreground"],
        "editorIndentGuide.background1": colors["--border-subtle"],
        "editorIndentGuide.activeBackground1": colors["--text-muted"],
        "editorWidget.background": colors["--card-bg"],
        "editorWidget.border": colors["--border-color"],
        "editorSuggestWidget.background": colors["--card-bg"],
        "editorSuggestWidget.border": colors["--border-color"],
        "editorOverviewRuler.border": colors["--border-color"],
        "scrollbarSlider.background": colors["--scrollbar-thumb"],
        "scrollbarSlider.hoverBackground": colors["--text-muted"],
      },
      rules: theme.isDark ? darkRules : lightRules,
    });
  });
}
