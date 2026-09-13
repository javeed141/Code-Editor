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

