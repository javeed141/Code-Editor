import type { RepoFile } from "@/src/types/editor";

export function getLanguageFromPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "js":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    case "md":
      return "markdown";
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
