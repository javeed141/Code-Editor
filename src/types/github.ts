export type GitHubUser = {
  id: number;
  login: string;
  avatar_url: string;
  name?: string | null;
};

export type Repository = {
  id: number;
  name: string;
  fullName: string;
  ownerLogin: string;
  defaultBranch: string;
  private: boolean;
};

export type SelectedRepository = {
  owner: string;
  repo: string;
  defaultBranch: string;
  branch?: string;
  headSha: string;
};

export type GitHubFileContent = {
  path: string;
  content: string;
  sha: string;
  size: number;
  isBinary?: boolean;
  isTooLarge?: boolean;
  message?: string;
};

export type BranchSnapshotFile = {
  path: string;
  name: string;
  content: string;
  sha: string;
  size: number;
  language: string;
  isBinary: boolean;
};

export type BranchSnapshotResponse = {
  repository: {
    owner: string;
    repo: string;
    branch: string;
    headSha: string;
  };
  files: BranchSnapshotFile[];
  tree: import("@/src/types/editor").RepoFile[];
};

