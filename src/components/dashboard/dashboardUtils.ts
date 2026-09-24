import { getLanguageFromPath } from "@/src/lib/utils";
import type { OpenFile } from "@/src/types/editor";

export const SELECTED_REPOSITORY_STORAGE_KEY = "ai-code-editor-selected-repository";

export function createOpenFile(
  path: string,
  content: string,
  name: string,
  options?: {
    isBinary?: boolean;
    isTooLarge?: boolean;
    message?: string;
    sha?: string;
    originalContent?: string;
  },
): OpenFile {
  const originalContent = options?.originalContent ?? content;
  return {
    path,
    name,
    language: getLanguageFromPath(path),
    originalContent,
    content,
    isModified: content !== originalContent,
    sha: options?.sha,
    isBinary: options?.isBinary,
    isTooLarge: options?.isTooLarge,
    message: options?.message,
  };
}
