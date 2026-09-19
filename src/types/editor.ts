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
  sha?: string;
  size?: number;
  isBinary?: boolean;
  isTooLarge?: boolean;
  message?: string;
};
