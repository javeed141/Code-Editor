export type RepoFile = {
  path: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: RepoFile[];
  sha?: string;
  size?: number;
};

export type OpenFile = {
  path: string;
  name: string;
  language: string;
  originalContent: string;
  content: string;
  isModified: boolean;
  sha?: string;
  size?: number;
  isBinary?: boolean;
  isTooLarge?: boolean;
  message?: string;
};
