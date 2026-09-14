import { Octokit } from "octokit";
import type { GitHubFileContent, GitHubUser, Repository } from "@/src/types/github";
import type { RepoFile } from "@/src/types/editor";

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "tiff",
  "pdf", "zip", "tar", "gz", "7z", "rar",
  "exe", "dll", "so", "dylib",
  "mp3", "mp4", "wav", "avi", "mov", "mkv",
  "woff", "woff2", "ttf", "eot", "otf"
]);

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB

export function getAuthenticatedOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

export async function getAuthenticatedUser(accessToken: string): Promise<GitHubUser> {
  const octokit = getAuthenticatedOctokit(accessToken);
  const { data } = await octokit.rest.users.getAuthenticated();
  return {
    id: data.id,
    login: data.login,
    avatar_url: data.avatar_url,
    name: data.name ?? null,
  };
}

export async function listRepositories(accessToken: string): Promise<Repository[]> {
  const octokit = getAuthenticatedOctokit(accessToken);
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
    affiliation: "owner,collaborator,organization_member",
  });

  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    ownerLogin: repo.owner.login,
    defaultBranch: repo.default_branch,
    private: repo.private,
  }));
}

export async function listInstallationRepositories(
  accessToken: string,
  installationId?: number,
): Promise<{ repositories: Repository[]; installationId?: number }> {
  const octokit = getAuthenticatedOctokit(accessToken);
  let targetInstallationId = installationId;

  // If installationId is not passed, discover it from the user's installations
  if (!targetInstallationId) {
    try {
      const { data: installations } = await octokit.rest.apps.listInstallationsForAuthenticatedUser();
      if (installations.installations.length > 0) {
        targetInstallationId = installations.installations[0].id;
      }
    } catch {
      // User may be using an OAuth App or has no installations
    }
  }

  // If a GitHub App installation is found, query only the permitted repositories
  if (targetInstallationId) {
    try {
      const { data } = await octokit.rest.apps.listInstallationReposForAuthenticatedUser({
        installation_id: targetInstallationId,
        per_page: 100,
      });

      const repositories: Repository[] = data.repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        ownerLogin: repo.owner.login,
        defaultBranch: repo.default_branch,
        private: repo.private,
      }));

      return { repositories, installationId: targetInstallationId };
    } catch (err) {
      console.warn("Failed to fetch installation repos, falling back to all user repos:", err);
    }
  }

  // Fallback to standard user repositories
  const repos = await listRepositories(accessToken);
  return { repositories: repos };
}

export async function getRepositoryTree(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ tree: RepoFile[]; headSha: string; defaultBranch: string }> {
  const octokit = getAuthenticatedOctokit(accessToken);

  // 1. Fetch branch information to obtain HEAD commit SHA
  const { data: branchData } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch,
  });

  const headSha = branchData.commit.sha;

  // 2. Query Git Trees API recursively with HEAD commit SHA
  const { data: treeData } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: headSha,
    recursive: "1",
  });

  const flatEntries = (treeData.tree || []).map((item) => ({
    path: item.path || "",
    type: item.type || "blob",
    sha: item.sha,
    size: item.size,
  }));

  const tree = buildFileTree(flatEntries);

  return {
    tree,
    headSha,
    defaultBranch: branch,
  };
}

export function buildFileTree(
  entries: Array<{ path: string; type: string; sha?: string; size?: number }>,
): RepoFile[] {
  type InternalNode = {
    path: string;
    name: string;
    type: "file" | "folder";
    children?: Map<string, InternalNode>;
    sha?: string;
    size?: number;
  };

  const rootNodes = new Map<string, InternalNode>();

  for (const entry of entries) {
    if (!entry.path) continue;
    const parts = entry.path.split("/");
    let currentMap = rootNodes;
    let accumulatedPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${part}` : part;

      if (isLast) {
        const isFolder = entry.type === "tree";
        if (!currentMap.has(part)) {
          currentMap.set(part, {
            path: accumulatedPath,
            name: part,
            type: isFolder ? "folder" : "file",
            children: isFolder ? new Map() : undefined,
            sha: entry.sha,
            size: entry.size,
          });
        }
      } else {
        let folderNode = currentMap.get(part);
        if (!folderNode) {
          folderNode = {
            path: accumulatedPath,
            name: part,
            type: "folder",
            children: new Map(),
          };
          currentMap.set(part, folderNode);
        }
        if (!folderNode.children) {
          folderNode.children = new Map();
        }
        currentMap = folderNode.children;
      }
    }
  }

  function convertMapToSortedArray(map: Map<string, InternalNode>): RepoFile[] {
    const list: RepoFile[] = [];

    for (const node of map.values()) {
      const childrenArray = node.children ? convertMapToSortedArray(node.children) : undefined;
      list.push({
        path: node.path,
        name: node.name,
        type: node.type,
        children: childrenArray,
      });
    }

    // Sort: Folders first, then alphabetically
    return list.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      return a.type === "folder" ? -1 : 1;
    });
  }

  return convertMapToSortedArray(rootNodes);
}

export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref: string,
): Promise<GitHubFileContent> {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";

  // Handle binary files
  if (BINARY_EXTENSIONS.has(ext)) {
    return {
      path,
      content: "",
      sha: "",
      size: 0,
      isBinary: true,
      message: "Binary file — preview unavailable",
    };
  }

  const octokit = getAuthenticatedOctokit(accessToken);

  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    const data = response.data;

    // Ensure it is a single file, not an array of directory contents
    if (Array.isArray(data) || data.type !== "file") {
      return {
        path,
        content: "",
        sha: "",
        size: 0,
        message: "Not a readable file.",
      };
    }

    if (data.size && data.size > MAX_FILE_SIZE_BYTES) {
      return {
        path,
        content: "",
        sha: data.sha,
        size: data.size,
        isTooLarge: true,
        message: "This file is too large to preview.",
      };
    }

    let decodedContent = "";
    if (data.content && data.encoding === "base64") {
      decodedContent = Buffer.from(data.content, "base64").toString("utf-8");
    } else if (data.content) {
      decodedContent = data.content;
    }

    return {
      path,
      content: decodedContent,
      sha: data.sha,
      size: data.size,
      isBinary: false,
    };
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 404) {
      throw new Error(`File '${path}' not found on branch '${ref}'.`);
    }
    throw error;
  }
}

export type CommitFile = {
  path: string;
  content: string | null; // null = deleted
  status: "modified" | "added" | "deleted";
};

export type CommitResult = {
  sha: string;
  message: string;
};

/**
 * Fetch the current HEAD SHA of a branch (used for stale detection).
 * Never returns the access token.
 */
export async function getBranchHead(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<{ headSha: string }> {
  const octokit = getAuthenticatedOctokit(accessToken);
  const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch });
  return { headSha: data.commit.sha };
}

/**
 * Create a single Git commit containing all changed files using GitHub's Git database API.
 * Uses blobs → tree → commit → update ref.
 * The branch ref update uses the expectedHeadSha to guard against race conditions.
 * If another push happened between HEAD check and our update, GitHub will reject it (409).
 */
export async function createCommit(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  expectedHeadSha: string,
  message: string,
  files: CommitFile[],
): Promise<CommitResult> {
  const octokit = getAuthenticatedOctokit(accessToken);

  // 1. Create blobs for added/modified files
  const treeEntries: Array<{
    path: string;
    mode: "100644";
    type: "blob";
    sha: string | null;
  }> = [];

  for (const file of files) {
    if (file.status === "deleted") {
      // Deleted files: add entry with sha = null to remove from tree
      treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: null });
    } else {
      // Modified / added: create a blob with the new content
      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content ?? "", "utf-8").toString("base64"),
        encoding: "base64",
      });
      treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
    }
  }

  // 2. Resolve the current commit's tree before applying the file changes.
  const { data: currentCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: expectedHeadSha,
  });

  // 3. Create a new tree based on the validated current HEAD tree
  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: currentCommit.tree.sha,
    tree: treeEntries,
  });

  // 4. Create a commit with the new tree, parented to the current HEAD
  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.sha,
    parents: [expectedHeadSha],
  });

  // 5. Update the branch reference to point to the new commit.
  //    force: false ensures we don't overwrite if someone else pushed.
  //    GitHub returns 422 if the ref is not an ancestor — we surface this as a conflict.
  try {
    await octokit.rest.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
      force: false,
    });
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 422) {
      // Branch moved after our HEAD check — race condition
      throw Object.assign(new Error("Branch reference is stale. Someone pushed after your HEAD check."), { status: 409 });
    }
    throw err;
  }

  return { sha: newCommit.sha, message };
}
