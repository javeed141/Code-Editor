export type RepoFile = {
  path: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: RepoFile[];
};

export type OpenFile = {
  path: string;
  name: string;
  language: string;
  originalContent: string;
  content: string;
  isModified: boolean;
};
