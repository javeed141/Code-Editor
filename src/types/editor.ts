export type RepoFile = {
  path: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  originalContent?: string;
  children?: RepoFile[];
  sha?: string;
  size?: number;
  language?: string;
  isBinary?: boolean;
  updatedAt?: number;
};

export type OpenFile = {
  path: string;
  name: string;
  language: string;
  originalContent: string;
  content: string;
  isModified: boolean;
  status?: "clean" | "modified" | "added" | "deleted";
  sha?: string;
  size?: number;
  isBinary?: boolean;
  isTooLarge?: boolean;
  message?: string;
};

/**
 * A file edit proposed by the AI agent, pending user Accept or Reject.
 * Stored separately from the open file so the user's current content is
 * never mutated until they explicitly accept.
 */
export type AIPendingEdit = {
  /** Relative file path (matches OpenFile.path) */
  path: string;
  /** Human-readable file name */
  name: string;
  /** Original file content BEFORE the AI edit (used as the "before" side of the diff) */
  originalContent: string;
  /** AI-proposed new content (used as the "after" side of the diff) */
  proposedContent: string;
  /** Language identifier for syntax highlighting */
  language: string;
  /** Creation timestamp */
  timestamp?: number;
};
