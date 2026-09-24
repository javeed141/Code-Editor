export type AIWorkspaceFile = {
  path: string;
  content: string;
  language?: string;
  isModified?: boolean;
};

export type AIWorkspace = {
  repository: string;
  branch: string;
  currentFile: string | null;
  files: AIWorkspaceFile[];
};

const BLOCKED_SEGMENTS = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".git",
  "node_modules",
  ".next",
]);

export function normalizeWorkspacePath(filePath: string): string {
  const normalized = filePath.trim().replaceAll("\\", "/");

  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("\0") ||
    normalized.split("/").some((segment) => segment === "..") ||
    normalized.split("/").some((segment) => BLOCKED_SEGMENTS.has(segment))
  ) {
    throw new Error("Access denied: file path must stay inside the current workspace.");
  }

  return normalized.replace(/^\.\/+/, "");
}

export function getWorkspaceFile(workspace: AIWorkspace, filePath: string): AIWorkspaceFile {
  const safePath = normalizeWorkspacePath(filePath);
  const file = workspace.files.find((entry) => entry.path === safePath);

  if (!file) {
    throw new Error(`File '${safePath}' is not available in the current workspace.`);
  }

  return file;
}
