import type { RepoFile } from "@/src/types/editor";

export function getLanguageFromPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "ts":
      return "typescript";
    case "tsx":
    case "jsx":
      return "typescript";
    case "json":
      return "json";
    case "css":
    case "scss":
    case "less":
      return "css";
    case "html":
    case "htm":
      return "html";
    case "md":
    case "markdown":
      return "markdown";
    case "py":
      return "python";
    case "sh":
    case "bash":
      return "shell";
    case "yaml":
    case "yml":
      return "yaml";
    case "xml":
    case "svg":
      return "xml";
    case "sql":
      return "sql";
    default:
      return "plaintext";
  }
}

export function findFileByPath(
  files: RepoFile[],
  path: string,
): RepoFile | undefined {
  for (const file of files) {
    if (file.path === path && file.type === "file") {
      return file;
    }

    if (file.children) {
      const match = findFileByPath(file.children, path);
      if (match) {
        return match;
      }
    }
  }

  return undefined;
}
