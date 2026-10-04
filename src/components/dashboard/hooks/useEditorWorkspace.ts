import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import type { ChangedFile } from "@/src/components/CommitDialog";
import {
  getRepositoryFile,
  getRepositoryFiles,
  getRepositorySnapshot,
  getRepositorySnapshotId,
  saveRepositoryFiles,
  saveRepositorySnapshot,
} from "@/src/lib/indexeddb";
import { buildFileTree } from "@/src/lib/github";
import { findFileByPath, getLanguageFromPath } from "@/src/lib/utils";
import type { AIPendingEdit, OpenFile, RepoFile } from "@/src/types/editor";
import type { BranchSnapshotFile, Repository, SelectedRepository } from "@/src/types/github";
import { createOpenFile, SELECTED_REPOSITORY_STORAGE_KEY } from "../dashboardUtils";

type OpenableFile = Pick<RepoFile, "path" | "name" | "content" | "originalContent" | "sha" | "isBinary">;

function isDraft(file: { content?: string; originalContent?: string }) {
  return (
    file.content !== undefined &&
    file.originalContent !== undefined &&
    file.content !== file.originalContent
  );
}

function getFilesToOpen(files: OpenableFile[]) {
  const drafts = files.filter(isDraft);
  const readme = files.find((file) => file.name.toLowerCase() === "readme.md");
  return drafts.length > 0 ? drafts : readme ? [readme] : [];
}

function createOpenFiles(files: OpenableFile[]) {
  return Object.fromEntries(
    files.map((file) => [
      file.path,
      createOpenFile(file.path, file.content ?? "", file.name, {
        sha: file.sha,
        isBinary: file.isBinary,
        originalContent: file.originalContent,
      }),
    ]),
  );
}

function mergeSnapshotFile(
  snapshotId: string,
  remoteFile: BranchSnapshotFile,
  cachedFile?: {
    content?: string;
    originalContent?: string;
    sha?: string;
  },
) {
  const keepDraft = cachedFile !== undefined && isDraft(cachedFile);
  const content = keepDraft ? cachedFile.content : remoteFile.content;
  const originalContent = keepDraft ? cachedFile.originalContent : remoteFile.content;

  return {
    id: `${snapshotId}:${remoteFile.path}`,
    snapshotId,
    path: remoteFile.path,
    name: remoteFile.name,
    type: "file" as const,
    content,
    originalContent,
    sha: keepDraft ? cachedFile.sha : remoteFile.sha,
    size: remoteFile.size,
    language: remoteFile.language,
    isBinary: remoteFile.isBinary,
    updatedAt: Date.now(),
  };
}

export type WorkspaceHint = {
  repoOwner: string;
  repoName: string;
  selectedBranch: string;
} | null;

export function useEditorWorkspace() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [reposAuthExpired, setReposAuthExpired] = useState(false);
  const [installationId, setInstallationId] = useState<number | undefined>(undefined);
  const [selectedRepository, setSelectedRepository] = useState<SelectedRepository | null>(null);
  const [rawRepositoryTree, setRawRepositoryTree] = useState<RepoFile[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);

  // Editor tabs & file state
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>({});
  const [isCommitting, setIsCommitting] = useState(false);
  const [indexedDbStatus, setIndexedDbStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [remoteConflict, setRemoteConflict] = useState<string | null>(null);

  const selectionRequestRef = useRef(0);

  // AI edit proposal queue — map of filepath -> proposed edit
  const [pendingAIEdits, setPendingAIEdits] = useState<Record<string, AIPendingEdit>>({});

  const pendingAIEditList = useMemo(() => Object.values(pendingAIEdits), [pendingAIEdits]);
  const pendingAIEdit = selectedPath ? pendingAIEdits[selectedPath] ?? null : null;

  const [virtualFolders, setVirtualFolders] = useState<Set<string>>(new Set());

  // Derived: effective repository tree combining base tree + openFiles + virtualFolders
  const repositoryTree = useMemo(() => {
    const fileEntriesMap = new Map<
      string,
      {
        path: string;
        type: string;
        sha?: string;
        size?: number;
        content?: string;
        originalContent?: string;
        language?: string;
        isBinary?: boolean;
      }
    >();

    function walkTree(nodes: RepoFile[]) {
      for (const node of nodes) {
        if (node.type === "file") {
          fileEntriesMap.set(node.path, {
            path: node.path,
            type: "blob",
            sha: node.sha,
            size: node.size,
            content: node.content,
            originalContent: node.originalContent,
            language: node.language,
            isBinary: node.isBinary,
          });
        } else if (node.type === "folder" && node.children) {
          walkTree(node.children);
        }
      }
    }
    walkTree(rawRepositoryTree);

    for (const folderPath of virtualFolders) {
      fileEntriesMap.set(folderPath, {
        path: folderPath,
        type: "tree",
      });
    }

    for (const [path, file] of Object.entries(openFiles)) {
      if (file.status === "deleted") {
        fileEntriesMap.delete(path);
      } else {
        const existing = fileEntriesMap.get(path);
        fileEntriesMap.set(path, {
          path: file.path,
          type: "blob",
          sha: existing?.sha || file.sha,
          size: existing?.size || file.size || file.content.length,
          content: file.content,
          originalContent: file.originalContent ?? existing?.originalContent ?? "",
          language: file.language || getLanguageFromPath(file.path),
          isBinary: file.isBinary,
        });
      }
    }

    return buildFileTree(Array.from(fileEntriesMap.values()));
  }, [rawRepositoryTree, openFiles, virtualFolders]);

  // Derived: all changed files (modified, added, deleted)
  const changedFiles: ChangedFile[] = useMemo(() => {
    return Object.values(openFiles)
      .filter(
        (f) =>
          !f.isBinary &&
          !f.isTooLarge &&
          (f.status === "added" || f.status === "deleted" || f.isModified || f.content !== f.originalContent),
      )
      .map((f) => {
        let status: ChangedFile["status"] = "modified";
        if (f.status === "added") status = "added";
        else if (f.status === "deleted") status = "deleted";
        else if (f.isModified || f.content !== f.originalContent) status = "modified";
        return {
          path: f.path,
          name: f.name,
          originalContent: f.originalContent ?? "",
          content: f.content ?? "",
          status,
        };
      });
  }, [openFiles]);

  const loadCachedSnapshot = useCallback(async (repo: Repository) => {
    const snapshotId = getRepositorySnapshotId(repo.ownerLogin, repo.name, repo.defaultBranch);
    const [cachedSnapshot, cachedFiles] = await Promise.all([
      getRepositorySnapshot(snapshotId),
      getRepositoryFiles(snapshotId),
    ]);

    if (!cachedSnapshot || cachedFiles.length === 0) {
      return false;
    }

    const snapshotTree = buildFileTree(
      cachedFiles.map((file) => ({
        path: file.path,
        type: "blob",
        sha: file.sha,
        size: file.size,
        content: file.content,
        language: file.language,
        isBinary: file.isBinary,
        originalContent: file.originalContent,
      })),
    );

    setRawRepositoryTree(snapshotTree);
    setSelectedRepository({
      owner: repo.ownerLogin,
      repo: repo.name,
      defaultBranch: repo.defaultBranch,
      branch: cachedSnapshot.branch,
      headSha: cachedSnapshot.headSha,
    });

    const filesToOpen = getFilesToOpen(cachedFiles);

    if (filesToOpen.length > 0) {
      setOpenFiles(createOpenFiles(filesToOpen));
      setSelectedPath(filesToOpen[0].path);
    }

    return true;
  }, []);

  // Select a repository & fetch its Git tree recursively
  const handleSelectRepository = useCallback(
    async (repo: Repository, forceRefresh = false) => {
      const requestId = ++selectionRequestRef.current;
      setTreeLoading(true);
      setOpenFiles({});
      setSelectedPath(null);
      setRawRepositoryTree([]);
      setVirtualFolders(new Set());

      const initialRepo: SelectedRepository = {
        owner: repo.ownerLogin,
        repo: repo.name,
        defaultBranch: repo.defaultBranch,
        branch: repo.defaultBranch,
        headSha: "",
      };
      try {
        if (!forceRefresh) {
          const hydrated = await loadCachedSnapshot(repo);
          if (requestId !== selectionRequestRef.current) return;
          if (hydrated) {
            setTreeLoading(false);
            return;
          }
        }

        const res = await fetch(
          `/api/github/branch-snapshot?owner=${encodeURIComponent(repo.ownerLogin)}&repo=${encodeURIComponent(
            repo.name,
          )}&branch=${encodeURIComponent(repo.defaultBranch)}`,
        );

        if (res.ok) {
          const data = await res.json();
          if (requestId !== selectionRequestRef.current) return;
          const files: BranchSnapshotFile[] = Array.isArray(data.files) ? data.files : [];
          const snapshotId = getRepositorySnapshotId(repo.ownerLogin, repo.name, repo.defaultBranch);
          const cachedFiles = await getRepositoryFiles(snapshotId);
          const cachedFilesByPathForHydration = new Map(cachedFiles.map((file) => [file.path, file]));

          await saveRepositorySnapshot({
            id: snapshotId,
            owner: repo.ownerLogin,
            repo: repo.name,
            branch: repo.defaultBranch,
            headSha: data.repository?.headSha || "",
            fetchedAt: Date.now(),
          });

          await saveRepositoryFiles(
            snapshotId,
            files.map((file) =>
              mergeSnapshotFile(snapshotId, file, cachedFilesByPathForHydration.get(file.path)),
            ),
          );

          const persistedFiles = files.map((file) => {
            const cachedFile = cachedFilesByPathForHydration.get(file.path);
            const persistedFile = mergeSnapshotFile(snapshotId, file, cachedFile);
            return {
              path: file.path,
              type: "blob",
              sha: persistedFile.sha,
              size: file.size,
              content: persistedFile.content,
              originalContent: persistedFile.originalContent,
              language: file.language,
              isBinary: file.isBinary,
            };
          });
          const persistedTree = buildFileTree(persistedFiles);
          setRawRepositoryTree(persistedTree);
          setSelectedRepository({
            ...initialRepo,
            branch: repo.defaultBranch,
            headSha: data.repository?.headSha || data.headSha || "",
          });

          // Sync active workspace to Supabase
          void fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repoOwner: repo.ownerLogin,
              repoName: repo.name,
              selectedBranch: repo.defaultBranch,
            }),
          }).catch((err) => {
            console.error("Failed to sync workspace to Supabase:", err);
          });

          const flattenedFiles: RepoFile[] = [];
          const visit = (nodes: RepoFile[]) => {
            nodes.forEach((node) => {
              if (node.type === "file") {
                flattenedFiles.push(node);
              }
              if (node.children) {
                visit(node.children);
              }
            });
          };
          visit(persistedTree);

          const filesToOpen = getFilesToOpen(flattenedFiles);

          if (filesToOpen.length > 0) {
            setOpenFiles(createOpenFiles(filesToOpen));
            setSelectedPath(filesToOpen[0].path);
          }
        } else {
          const errData = await res.json();
          console.error("Branch snapshot fetch failed:", errData.error);
          setRawRepositoryTree([]);
        }
      } catch (err) {
        if (requestId !== selectionRequestRef.current) return;
        console.error("Error fetching repository snapshot:", err);
        setRawRepositoryTree([]);
      } finally {
        if (requestId === selectionRequestRef.current) {
          setTreeLoading(false);
        }
      }
    },
    [loadCachedSnapshot],
  );

  /**
   * Fetch repositories and auto-select using this priority order:
   * 1. workspaceHint from Supabase (cross-device, most reliable)
   * 2. localStorage (same-device fast restore)
   * 3. Auto-select if only 1 repo is granted on GitHub
   */
  const fetchRepositories = useCallback(
    async (workspaceHint: WorkspaceHint = null) => {
      setReposLoading(true);
      setReposError(null);
      setReposAuthExpired(false);
      try {
        const res = await fetch("/api/github/repos");
        if (res.ok) {
          const data = await res.json();
          const repos: Repository[] = data.repositories || [];
          setRepositories(repos);
          if (data.installationId) {
            setInstallationId(data.installationId);
          }

          // Priority 1: Supabase workspace hint (cross-device restore)
          if (workspaceHint) {
            const match = repos.find(
              (repo) =>
                repo.ownerLogin === workspaceHint.repoOwner &&
                repo.name === workspaceHint.repoName,
            );
            if (match) {
              void handleSelectRepository(match);
              return;
            }
          }

          // Priority 2: localStorage (same-device fast restore)
          const savedRepo = localStorage.getItem(SELECTED_REPOSITORY_STORAGE_KEY);
          if (savedRepo) {
            try {
              const parsed = JSON.parse(savedRepo) as SelectedRepository;
              const match = repos.find(
                (repo) =>
                  repo.ownerLogin === parsed.owner &&
                  repo.name === parsed.repo &&
                  repo.defaultBranch === parsed.defaultBranch,
              );
              if (match) {
                void handleSelectRepository(match);
                return;
              }
            } catch (error) {
              console.warn("Stored repo selection is invalid, clearing it.", error);
              localStorage.removeItem(SELECTED_REPOSITORY_STORAGE_KEY);
            }
          }

          // Priority 3: Auto-select if only 1 repository is permitted on GitHub
          if (repos.length === 1) {
            void handleSelectRepository(repos[0]);
          }
        } else {
          const data = await res.json().catch(() => null);
          setRepositories([]);
          setReposError(data?.error || "Unable to load repositories from GitHub.");
          setReposAuthExpired(Boolean(data?.reauthenticate));
        }
      } catch (err) {
        console.error("Failed to load repositories:", err);
        setRepositories([]);
        setReposError("Unable to reach GitHub. Check your connection and try again.");
      } finally {
        setReposLoading(false);
      }
    },
    [handleSelectRepository],
  );

  // Save selectedRepository to localStorage
  useEffect(() => {
    if (!selectedRepository) return;

    const persistedRepository = {
      owner: selectedRepository.owner,
      repo: selectedRepository.repo,
      defaultBranch: selectedRepository.defaultBranch,
      branch: selectedRepository.branch ?? selectedRepository.defaultBranch,
      headSha: selectedRepository.headSha,
    };

    localStorage.setItem(SELECTED_REPOSITORY_STORAGE_KEY, JSON.stringify(persistedRepository));
  }, [selectedRepository]);

  // Handle tree node file click
  const handleFileSelect = useCallback(
    async (path: string) => {
      if (openFiles[path]) {
        setSelectedPath(path);
        return;
      }

      if (selectedRepository) {
        const snapshotFile = findFileByPath(repositoryTree, path);
        if (snapshotFile?.content !== undefined) {
          const snapshotId = getRepositorySnapshotId(
            selectedRepository.owner,
            selectedRepository.repo,
            selectedRepository.defaultBranch,
          );
          const cachedFile = await getRepositoryFile(snapshotId, path);
          setOpenFiles((current) => ({
            ...current,
            [path]: createOpenFile(path, snapshotFile.content ?? "", snapshotFile.name, {
              sha: snapshotFile.sha,
              isBinary: snapshotFile.isBinary,
              originalContent: cachedFile?.originalContent,
            }),
          }));
          setSelectedPath(path);
          return;
        }

        try {
          const snapshotId = getRepositorySnapshotId(
            selectedRepository.owner,
            selectedRepository.repo,
            selectedRepository.defaultBranch,
          );
          const cachedFile = await getRepositoryFile(snapshotId, path);
          if (cachedFile?.content !== undefined) {
            setOpenFiles((current) => ({
              ...current,
              [path]: createOpenFile(path, cachedFile.content ?? "", cachedFile.name, {
                sha: cachedFile.sha,
                isBinary: cachedFile.isBinary,
                originalContent: cachedFile.originalContent,
              }),
            }));
            setSelectedPath(path);
          }
        } catch (error) {
          console.error("Unable to load cached file from snapshot:", error);
        }
        return;
      }

      // Fallback mock repository
      const file = findFileByPath(repositoryTree, path);
      if (!file || file.content === undefined) return;
      const demoSnapshotId = getRepositorySnapshotId("demo", "demo-project", "main");
      const cachedFile = await getRepositoryFile(demoSnapshotId, path);
      setOpenFiles((current) => ({
        ...current,
        [path]: createOpenFile(path, cachedFile?.content ?? file.content ?? "", file.name, {
          originalContent: cachedFile?.originalContent ?? file.content,
        }),
      }));
      setSelectedPath(path);
    },
    [openFiles, repositoryTree, selectedRepository],
  );

  // Refresh current repository tree
  const handleRefreshTree = useCallback(() => {
    if (selectedRepository) {
      const repoMatch = repositories.find(
        (r) => r.ownerLogin === selectedRepository.owner && r.name === selectedRepository.repo,
      );
      if (repoMatch) {
        handleSelectRepository(repoMatch, true);
      }
    }
  }, [handleSelectRepository, repositories, selectedRepository]);

  // Close open tab
  const handleCloseTab = useCallback(
    (path: string) => {
      setOpenFiles((current) => {
        const next = { ...current };
        delete next[path];

        if (selectedPath === path) {
          const remainingKeys = Object.keys(next);
          setSelectedPath(remainingKeys.length > 0 ? remainingKeys[remainingKeys.length - 1] : null);
        }

        return next;
      });
    },
    [selectedPath],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      if (!selectedPath) return;
      setOpenFiles((current) => {
        const file = current[selectedPath];
        if (!file) return current;
        return {
          ...current,
          [selectedPath]: {
            ...file,
            content,
            isModified: content !== file.originalContent,
          },
        };
      });
    },
    [selectedPath],
  );

  const getSnapshotId = useCallback(() => {
    if (selectedRepository) {
      return getRepositorySnapshotId(
        selectedRepository.owner,
        selectedRepository.repo,
        selectedRepository.defaultBranch,
      );
    }
    return getRepositorySnapshotId("demo", "demo-project", "main");
  }, [selectedRepository]);

  const handleSave = useCallback(async () => {
    const modifiedFiles = Object.values(openFiles).filter(
      (file) => file.isModified && !file.isBinary && !file.isTooLarge,
    );

    if (!modifiedFiles.length) return;

    const snapshotId = getSnapshotId();
    const savedAt = Date.now();
    setIndexedDbStatus("saving");

    try {
      await saveRepositoryFiles(
        snapshotId,
        modifiedFiles.map((file) => ({
          id: `${snapshotId}:${file.path}`,
          snapshotId,
          path: file.path,
          name: file.name,
          type: "file" as const,
          content: file.content,
          originalContent: file.originalContent,
          sha: file.sha,
          language: file.language,
          isBinary: file.isBinary,
          updatedAt: savedAt,
        })),
      );
      setIndexedDbStatus("saved");
    } catch (error) {
      console.error("Failed to save editor changes to IndexedDB:", error);
      setIndexedDbStatus("error");
    }
  }, [openFiles, getSnapshotId]);

  // Debounced auto-save effect: save modified files to IndexedDB after 1000ms of inactivity
  useEffect(() => {
    const hasModifiedFiles = Object.values(openFiles).some(
      (file) => file.isModified && !file.isBinary && !file.isTooLarge,
    );
    if (!hasModifiedFiles) return;

    const timer = setTimeout(() => {
      void handleSave();
    }, 1000);

    return () => clearTimeout(timer);
  }, [openFiles, handleSave]);

  const handleCommitSuccess = useCallback(
    async (
      _commitSha: string,
      newHeadSha: string,
      committedFiles: ChangedFile[],
    ) => {
      const committedPaths = new Set(committedFiles.map((f) => f.path));

      setOpenFiles((current) => {
        const updated = { ...current };
        for (const path of committedPaths) {
          const file = updated[path];
          if (file) {
            updated[path] = {
              ...file,
              originalContent: file.content, // new baseline = what was committed
              isModified: false,
            };
          }
        }
        return updated;
      });

      // Update the repository's headSha to the new commit so future commits chain correctly
      setSelectedRepository((prev) =>
        prev ? { ...prev, headSha: newHeadSha } : prev,
      );

      const snapshotId = getSnapshotId();

      try {
        await saveRepositoryFiles(
          snapshotId,
          committedFiles.map((committedFile) => {
            const file = openFiles[committedFile.path];
            return {
              id: `${snapshotId}:${committedFile.path}`,
              snapshotId,
              path: committedFile.path,
              name: committedFile.name,
              type: "file" as const,
              content: committedFile.content,
              originalContent: committedFile.content,
              sha: file?.sha,
              language: file?.language,
              isBinary: file?.isBinary,
              updatedAt: Date.now(),
            };
          }),
        );
        await saveRepositorySnapshot({
          id: snapshotId,
          owner: selectedRepository?.owner ?? "demo",
          repo: selectedRepository?.repo ?? "demo-project",
          branch: selectedRepository?.branch ?? selectedRepository?.defaultBranch ?? "main",
          headSha: newHeadSha,
          fetchedAt: Date.now(),
        });
      } catch (error) {
        console.error("Failed to update the IndexedDB snapshot after commit:", error);
      }
    },
    [getSnapshotId, openFiles, selectedRepository],
  );

  const handleDirectCommit = useCallback(async () => {
    if (!selectedRepository || changedFiles.length === 0 || isCommitting) return;
    setIsCommitting(true);
    setRemoteConflict(null);
    try {
      const response = await fetch("/api/github/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: selectedRepository.owner,
          repo: selectedRepository.repo,
          branch: selectedRepository.defaultBranch,
          expectedHeadSha: selectedRepository.headSha,
          message: "Update files",
          files: changedFiles.map((file) => ({
            path: file.path,
            content: file.status === "deleted" ? null : file.content,
            status: file.status,
          })),
        }),
      });
      const data = await response.json();
      if (response.status === 409) {
        setRemoteConflict("The remote branch changed. Refresh the repository before committing again.");
        toast.add({
          title: "Commit failed",
          description: "The remote branch changed. Refresh the repository before committing again.",
          type: "error",
        });
        return;
      }
      if (!response.ok) {
        const message = data.message || data.error || "Commit failed. Try again.";
        setRemoteConflict(message);
        toast.add({ title: "Commit failed", description: message, type: "error" });
        return;
      }
      await handleCommitSuccess(data.sha, data.headSha || data.sha, changedFiles);
      toast.add({
        title: "Committed successfully",
        description: `Committed ${changedFiles.length} file${changedFiles.length === 1 ? "" : "s"} to GitHub.`,
        type: "success",
      });
    } catch {
      const message = "Network error. Unable to reach GitHub.";
      setRemoteConflict(message);
      toast.add({ title: "Commit failed", description: message, type: "error" });
    } finally {
      setIsCommitting(false);
    }
  }, [changedFiles, handleCommitSuccess, isCommitting, selectedRepository]);

  const handleDiscard = useCallback(() => {
    if (!selectedPath) return;
    setOpenFiles((current) => {
      const file = current[selectedPath];
      if (!file) return current;
      return {
        ...current,
        [selectedPath]: {
          ...file,
          content: file.originalContent,
          isModified: false,
        },
      };
    });
  }, [selectedPath]);

  const handleRevertFile = useCallback((path: string) => {
    setOpenFiles((current) => {
      const file = current[path];
      if (!file) return current;

      return {
        ...current,
        [path]: {
          ...file,
          content: file.originalContent,
          isModified: false,
        },
      };
    });
  }, []);

  const handleRevertAll = useCallback(() => {
    setOpenFiles((current) =>
      Object.fromEntries(
        Object.entries(current).map(([path, file]) => [
          path,
          { ...file, content: file.originalContent, isModified: false },
        ]),
      ),
    );
  }, []);

  const resetWorkspace = useCallback(() => {
    setSelectedRepository(null);
    setRepositories([]);
    setInstallationId(undefined);
    setOpenFiles({});
    setSelectedPath(null);
    setRawRepositoryTree([]);
    setPendingAIEdits({});
    setVirtualFolders(new Set());
  }, []);

  /**
   * Create a new file in local workspace.
   */
  const handleCreateFile = useCallback(
    (parentDirPath: string, fileName: string): boolean => {
      const trimmedName = fileName.trim();
      if (!trimmedName) {
        toast.add({ title: "Validation error", description: "File name cannot be empty.", type: "error" });
        return false;
      }
      if (trimmedName.includes("/") || trimmedName.includes("\\")) {
        toast.add({ title: "Validation error", description: "File name cannot contain slashes.", type: "error" });
        return false;
      }

      const parent = parentDirPath.trim().replace(/^\/+|\/+$/g, "");
      const fullPath = parent ? `${parent}/${trimmedName}` : trimmedName;

      if (openFiles[fullPath] && openFiles[fullPath].status !== "deleted") {
        toast.add({ title: "File exists", description: `A file at "${fullPath}" already exists.`, type: "error" });
        return false;
      }

      const newFile: OpenFile = {
        path: fullPath,
        name: trimmedName,
        language: getLanguageFromPath(fullPath),
        originalContent: "",
        content: "",
        isModified: true,
        status: "added",
      };

      setOpenFiles((prev) => ({
        ...prev,
        [fullPath]: newFile,
      }));
      setSelectedPath(fullPath);

      toast.add({ title: "File created", description: `Created "${fullPath}".`, type: "success" });
      return true;
    },
    [openFiles],
  );

  /**
   * Create a new folder in local workspace natively.
   */
  const handleCreateFolder = useCallback(
    (parentDirPath: string, folderName: string): boolean => {
      const trimmedName = folderName.trim();
      if (!trimmedName) {
        toast.add({ title: "Validation error", description: "Folder name cannot be empty.", type: "error" });
        return false;
      }
      if (trimmedName.includes("/") || trimmedName.includes("\\")) {
        toast.add({ title: "Validation error", description: "Folder name cannot contain slashes.", type: "error" });
        return false;
      }

      const parent = parentDirPath.trim().replace(/^\/+|\/+$/g, "");
      const folderPath = parent ? `${parent}/${trimmedName}` : trimmedName;

      setVirtualFolders((prev) => {
        const next = new Set(prev);
        next.add(folderPath);
        return next;
      });

      toast.add({ title: "Folder created", description: `Created folder "${folderPath}".`, type: "success" });
      return true;
    },
    [],
  );

  /**
   * Rename a file or folder in local workspace.
   */
  const handleRename = useCallback(
    (oldPath: string, newName: string, isFolder: boolean): boolean => {
      const trimmedName = newName.trim();
      if (!trimmedName) {
        toast.add({ title: "Validation error", description: "Name cannot be empty.", type: "error" });
        return false;
      }
      if (trimmedName.includes("/") || trimmedName.includes("\\")) {
        toast.add({ title: "Validation error", description: "Name cannot contain slashes.", type: "error" });
        return false;
      }

      if (isFolder) {
        const parts = oldPath.split("/");
        const parentPath = parts.slice(0, -1).join("/");
        const newFolderPath = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;

        if (newFolderPath === oldPath) return true;

        setOpenFiles((current) => {
          const next = { ...current };
          const prefix = `${oldPath}/`;

          for (const [path, file] of Object.entries(current)) {
            if (path === oldPath || path.startsWith(prefix)) {
              const relPath = path.slice(oldPath.length);
              const targetPath = `${newFolderPath}${relPath}`;
              const targetName = targetPath.split("/").pop() ?? targetPath;

              if (file.status === "added") {
                delete next[path];
                next[targetPath] = {
                  ...file,
                  path: targetPath,
                  name: targetName,
                };
              } else {
                next[path] = {
                  ...file,
                  status: "deleted",
                  isModified: true,
                };
                next[targetPath] = {
                  path: targetPath,
                  name: targetName,
                  language: file.language,
                  originalContent: "",
                  content: file.content,
                  isModified: true,
                  status: "added",
                  sha: file.sha,
                };
              }
            }
          }
          return next;
        });

        setVirtualFolders((prev) => {
          const next = new Set<string>();
          const prefix = `${oldPath}/`;
          for (const folderPath of prev) {
            if (folderPath === oldPath) {
              next.add(newFolderPath);
            } else if (folderPath.startsWith(prefix)) {
              const relPath = folderPath.slice(oldPath.length);
              next.add(`${newFolderPath}${relPath}`);
            } else {
              next.add(folderPath);
            }
          }
          return next;
        });

        if (selectedPath && (selectedPath === oldPath || selectedPath.startsWith(`${oldPath}/`))) {
          const relPath = selectedPath.slice(oldPath.length);
          setSelectedPath(`${newFolderPath}${relPath}`);
        }

        toast.add({ title: "Folder renamed", description: `Renamed to "${newFolderPath}".`, type: "success" });
        return true;
      } else {
        const parts = oldPath.split("/");
        const parentPath = parts.slice(0, -1).join("/");
        const newFilePath = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;

        if (newFilePath === oldPath) return true;

        const oldFile = openFiles[oldPath];
        if (!oldFile) return false;

        setOpenFiles((current) => {
          const next = { ...current };
          if (oldFile.status === "added") {
            delete next[oldPath];
            next[newFilePath] = {
              ...oldFile,
              path: newFilePath,
              name: trimmedName,
              language: getLanguageFromPath(newFilePath),
            };
          } else {
            next[oldPath] = {
              ...oldFile,
              status: "deleted",
              isModified: true,
            };
            next[newFilePath] = {
              path: newFilePath,
              name: trimmedName,
              language: getLanguageFromPath(newFilePath),
              originalContent: "",
              content: oldFile.content,
              isModified: true,
              status: "added",
              sha: oldFile.sha,
            };
          }
          return next;
        });

        if (selectedPath === oldPath) {
          setSelectedPath(newFilePath);
        }

        toast.add({ title: "File renamed", description: `Renamed to "${trimmedName}".`, type: "success" });
        return true;
      }
    },
    [openFiles, selectedPath],
  );

  /**
   * Delete a file or folder in local workspace.
   */
  const handleDelete = useCallback(
    (targetPath: string, isFolder: boolean) => {
      if (isFolder) {
        const prefix = `${targetPath}/`;
        setOpenFiles((current) => {
          const next = { ...current };
          for (const [path, file] of Object.entries(current)) {
            if (path === targetPath || path.startsWith(prefix)) {
              if (file.status === "added") {
                delete next[path];
              } else {
                next[path] = {
                  ...file,
                  status: "deleted",
                  isModified: true,
                };
              }
            }
          }
          return next;
        });

        setVirtualFolders((prev) => {
          const next = new Set<string>();
          const prefix = `${targetPath}/`;
          for (const folderPath of prev) {
            if (folderPath !== targetPath && !folderPath.startsWith(prefix)) {
              next.add(folderPath);
            }
          }
          return next;
        });

        if (selectedPath && (selectedPath === targetPath || selectedPath.startsWith(prefix))) {
          setSelectedPath(null);
        }
        toast.add({ title: "Folder deleted", description: `Deleted "${targetPath}".`, type: "info" });
      } else {
        const file = openFiles[targetPath];
        setOpenFiles((current) => {
          const next = { ...current };
          if (file?.status === "added") {
            delete next[targetPath];
          } else if (file) {
            next[targetPath] = {
              ...file,
              status: "deleted",
              isModified: true,
            };
          } else {
            const treeNode = findFileByPath(repositoryTree, targetPath);
            next[targetPath] = {
              path: targetPath,
              name: targetPath.split("/").pop() ?? targetPath,
              language: getLanguageFromPath(targetPath),
              originalContent: treeNode?.content ?? "",
              content: "",
              isModified: true,
              status: "deleted",
              sha: treeNode?.sha,
            };
          }
          return next;
        });

        if (selectedPath === targetPath) {
          setSelectedPath(null);
        }
        toast.add({ title: "File deleted", description: `Deleted "${targetPath}".`, type: "info" });
      }
    },
    [openFiles, repositoryTree, selectedPath],
  );

  /**
   * Called by ChatPanel when the AI writeFile tool fires.
   * Stores the proposed edit in the queue and opens the target file in a tab so the
   * user can review the Monaco DiffEditor before accepting or rejecting.
   */
  const applyAIProposal = useCallback(
    async (path: string, proposedContent: string) => {
      const language = getLanguageFromPath(path);
      const name = path.split("/").pop() ?? path;

      // Resolve current content from open tab first, then tree, then IndexedDB
      let originalContent = "";

      const openTab = openFiles[path];
      if (openTab) {
        originalContent = openTab.content;
      } else {
        const treeFile = findFileByPath(repositoryTree, path);
        if (treeFile?.content !== undefined) {
          originalContent = treeFile.content;
        } else if (selectedRepository) {
          try {
            const snapshotId = getRepositorySnapshotId(
              selectedRepository.owner,
              selectedRepository.repo,
              selectedRepository.defaultBranch,
            );
            const cached = await getRepositoryFile(snapshotId, path);
            if (cached?.content !== undefined) originalContent = cached.content;
          } catch {
            // fallback to empty string
          }
        }
      }

      // Ensure the file is open in a tab so the diff renders in context
      if (!openTab) {
        setOpenFiles((current) => ({
          ...current,
          [path]: createOpenFile(path, originalContent, name, { originalContent }),
        }));
      }

      setSelectedPath(path);
      const proposal: AIPendingEdit = { path, name, originalContent, proposedContent, language, timestamp: Date.now() };

      setPendingAIEdits((current) => {
        const next = { ...current, [path]: proposal };
        const totalPending = Object.keys(next).length;
        toast.add({
          title: totalPending > 1 ? `AI proposed edits (${totalPending} pending)` : "AI proposed an edit",
          description: `Review changes to ${name} or review all pending files.`,
          type: "info",
        });
        return next;
      });
    },
    [openFiles, repositoryTree, selectedRepository],
  );

  /**
   * Accept a specific pending AI edit (or the currently selected file edit).
   */
  const acceptAIEdit = useCallback(
    (targetPath?: string) => {
      const path = targetPath || selectedPath;
      if (!path) return;

      setPendingAIEdits((currentQueue) => {
        const proposal = currentQueue[path];
        if (!proposal) return currentQueue;

        setOpenFiles((currentFiles) => {
          const file = currentFiles[path];
          if (!file) return currentFiles;
          return {
            ...currentFiles,
            [path]: {
              ...file,
              content: proposal.proposedContent,
              isModified: proposal.proposedContent !== file.originalContent,
            },
          };
        });

        const next = { ...currentQueue };
        delete next[path];
        toast.add({ title: "Edit accepted", description: `Applied changes to ${proposal.name}.`, type: "success" });
        return next;
      });
    },
    [selectedPath],
  );

  /**
   * Reject a specific pending AI edit (or the currently selected file edit).
   */
  const rejectAIEdit = useCallback(
    (targetPath?: string) => {
      const path = targetPath || selectedPath;
      if (!path) return;

      setPendingAIEdits((currentQueue) => {
        const proposal = currentQueue[path];
        if (!proposal) return currentQueue;

        const next = { ...currentQueue };
        delete next[path];
        toast.add({ title: "Edit rejected", description: `Discarded changes to ${proposal.name}.`, type: "info" });
        return next;
      });
    },
    [selectedPath],
  );

  /**
   * Accept all pending AI proposed edits in the queue at once.
   */
  const acceptAllAIEdits = useCallback(() => {
    const proposals = Object.values(pendingAIEdits);
    if (proposals.length === 0) return;

    setOpenFiles((currentFiles) => {
      const nextFiles = { ...currentFiles };
      for (const proposal of proposals) {
        const existing = nextFiles[proposal.path];
        const originalContent = existing ? existing.originalContent : proposal.originalContent;
        nextFiles[proposal.path] = {
          path: proposal.path,
          name: proposal.name,
          language: proposal.language,
          originalContent,
          content: proposal.proposedContent,
          isModified: proposal.proposedContent !== originalContent,
        };
      }
      return nextFiles;
    });

    setPendingAIEdits({});
    toast.add({
      title: "Accepted all edits",
      description: `Applied changes to ${proposals.length} file${proposals.length > 1 ? "s" : ""}.`,
      type: "success",
    });
  }, [pendingAIEdits]);

  /**
   * Reject all pending AI proposed edits in the queue at once.
   */
  const rejectAllAIEdits = useCallback(() => {
    const count = Object.keys(pendingAIEdits).length;
    if (count === 0) return;

    setPendingAIEdits({});
    toast.add({
      title: "Discarded all edits",
      description: `Discarded proposed changes for ${count} file${count > 1 ? "s" : ""}.`,
      type: "info",
    });
  }, [pendingAIEdits]);


  const selectedFile = selectedPath ? openFiles[selectedPath] : undefined;

  const workspaceFileMap = new Map(
    Object.values(openFiles).map((file) => [
      file.path,
      {
        path: file.path,
        content: file.content,
        language: file.language,
        isModified: file.isModified,
      },
    ]),
  );

  const addWorkspaceFiles = (nodes: RepoFile[]) => {
    for (const node of nodes) {
      if (node.type === "file" && node.content !== undefined && !workspaceFileMap.has(node.path)) {
        workspaceFileMap.set(node.path, {
          path: node.path,
          content: node.content,
          language: node.language ?? getLanguageFromPath(node.path),
          isModified: false,
        });
      }
      if (node.children) addWorkspaceFiles(node.children);
    }
  };
  addWorkspaceFiles(repositoryTree);
  const workspaceFiles = Array.from(workspaceFileMap.values());

  return {
    repositories,
    reposLoading,
    reposError,
    reposAuthExpired,
    installationId,
    selectedRepository,
    setSelectedRepository,
    repositoryTree,
    treeLoading,
    selectedPath,
    setSelectedPath,
    openFiles,
    selectedFile,
    workspaceFiles,
    changedFiles,
    isCommitting,
    indexedDbStatus,
    remoteConflict,
    setRemoteConflict,
    pendingAIEdit,
    pendingAIEdits,
    pendingAIEditList,
    handleSelectRepository,
    fetchRepositories,
    handleFileSelect,
    handleRefreshTree,
    handleCloseTab,
    handleContentChange,
    handleSave,
    handleDirectCommit,
    handleDiscard,
    handleRevertFile,
    handleRevertAll,
    handleCommitSuccess,
    resetWorkspace,
    applyAIProposal,
    acceptAIEdit,
    rejectAIEdit,
    acceptAllAIEdits,
    rejectAllAIEdits,
    handleCreateFile,
    handleCreateFolder,
    handleRename,
    handleDelete,
  };
}
