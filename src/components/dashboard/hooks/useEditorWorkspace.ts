import { useCallback, useEffect, useRef, useState } from "react";
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
import type { OpenFile, RepoFile } from "@/src/types/editor";
import type { Repository, SelectedRepository } from "@/src/types/github";
import { createOpenFile, SELECTED_REPOSITORY_STORAGE_KEY } from "../dashboardUtils";

export function useEditorWorkspace() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [installationId, setInstallationId] = useState<number | undefined>(undefined);
  const [selectedRepository, setSelectedRepository] = useState<SelectedRepository | null>(null);
  const [repositoryTree, setRepositoryTree] = useState<RepoFile[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);

  // Editor tabs & file state
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>({});
  const [isCommitting, setIsCommitting] = useState(false);
  const [indexedDbStatus, setIndexedDbStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [remoteConflict, setRemoteConflict] = useState<string | null>(null);

  const selectionRequestRef = useRef(0);

  // Derived: all open files that have been modified from their original content
  const changedFiles: ChangedFile[] = Object.values(openFiles)
    .filter((f) => f.isModified && !f.isBinary && !f.isTooLarge)
    .map((f) => ({
      path: f.path,
      name: f.name,
      originalContent: f.originalContent,
      content: f.content,
      status: "modified" as const,
    }));

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

    setRepositoryTree(snapshotTree);
    setSelectedRepository({
      owner: repo.ownerLogin,
      repo: repo.name,
      defaultBranch: repo.defaultBranch,
      branch: cachedSnapshot.branch,
      headSha: cachedSnapshot.headSha,
    });

    const draftFiles = cachedFiles.filter(
      (file) =>
        file.content !== undefined &&
        file.originalContent !== undefined &&
        file.content !== file.originalContent,
    );
    const readme = cachedFiles.find((file) => file.name.toLowerCase() === "readme.md");
    const filesToOpen = draftFiles.length > 0 ? draftFiles : readme ? [readme] : [];

    if (filesToOpen.length > 0) {
      setOpenFiles(
        Object.fromEntries(
          filesToOpen.map((file) => [
            file.path,
            createOpenFile(file.path, file.content ?? "", file.name, {
              sha: file.sha,
              isBinary: file.isBinary,
              originalContent: file.originalContent,
            }),
          ]),
        ),
      );
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
      setRepositoryTree([]);

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
          const snapshotTree: RepoFile[] = Array.isArray(data.tree) ? data.tree : [];
          const files = Array.isArray(data.files) ? data.files : [];
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
            files.map((file: { path: string; name: string; content: string; sha?: string; size?: number; language?: string; isBinary?: boolean }) => {
              const cachedFile = cachedFilesByPathForHydration.get(file.path);
              const hasDraft =
                cachedFile?.originalContent !== undefined &&
                cachedFile.content !== cachedFile.originalContent;

              return {
                id: `${snapshotId}:${file.path}`,
                snapshotId,
                path: file.path,
                name: file.name,
                type: "file" as const,
                content: hasDraft ? cachedFile.content : file.content,
                originalContent: hasDraft ? cachedFile.originalContent : file.content,
                sha: hasDraft ? cachedFile.sha : file.sha,
                size: file.size,
                language: file.language,
                isBinary: file.isBinary,
                updatedAt: Date.now(),
              };
            }),
          );

          const persistedFiles = files.map((file: { path: string; name: string; content: string; sha?: string; size?: number; language?: string; isBinary?: boolean }) => {
            const cachedFile = cachedFilesByPathForHydration.get(file.path);
            const hasDraft =
              cachedFile?.originalContent !== undefined &&
              cachedFile.content !== cachedFile.originalContent;
            return {
              path: file.path,
              type: "blob",
              sha: hasDraft ? cachedFile.sha : file.sha,
              size: file.size,
              content: hasDraft ? cachedFile.content : file.content,
              originalContent: hasDraft ? cachedFile.originalContent : file.content,
              language: file.language,
              isBinary: file.isBinary,
            };
          });
          const persistedTree = buildFileTree(persistedFiles);
          setRepositoryTree(persistedTree);
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

          const readme = flattenedFiles.find(
            (file) => file.type === "file" && file.name.toLowerCase() === "readme.md",
          );
          const draftFiles = flattenedFiles.filter(
            (file) =>
              file.content !== undefined &&
              file.originalContent !== undefined &&
              file.content !== file.originalContent,
          );
          const filesToOpen = draftFiles.length > 0 ? draftFiles : readme ? [readme] : [];

          if (filesToOpen.length > 0) {
            setOpenFiles(
              Object.fromEntries(
                filesToOpen.map((file) => [
                  file.path,
                  createOpenFile(file.path, file.content ?? "", file.name, {
                    sha: file.sha,
                    isBinary: file.isBinary,
                    originalContent: file.originalContent,
                  }),
                ]),
              ),
            );
            setSelectedPath(filesToOpen[0].path);
          }
        } else {
          const errData = await res.json();
          console.error("Branch snapshot fetch failed:", errData.error);
          setRepositoryTree([]);
        }
      } catch (err) {
        if (requestId !== selectionRequestRef.current) return;
        console.error("Error fetching repository snapshot:", err);
        setRepositoryTree([]);
      } finally {
        if (requestId === selectionRequestRef.current) {
          setTreeLoading(false);
        }
      }
    },
    [loadCachedSnapshot],
  );

  // Fetch repositories and auto-select if stored or only 1 is granted by the user on GitHub
  const fetchRepositories = useCallback(async () => {
    setReposLoading(true);
    try {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = await res.json();
        const repos: Repository[] = data.repositories || [];
        setRepositories(repos);
        if (data.installationId) {
          setInstallationId(data.installationId);
        }

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
              handleSelectRepository(match);
              return;
            }
          } catch (error) {
            console.warn("Stored repo selection is invalid, clearing it.", error);
            localStorage.removeItem(SELECTED_REPOSITORY_STORAGE_KEY);
          }
        }

        // Auto-select immediately if only 1 repository is permitted on GitHub!
        if (repos.length === 1) {
          handleSelectRepository(repos[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load repositories:", err);
    } finally {
      setReposLoading(false);
    }
  }, [handleSelectRepository]);

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
    setRepositoryTree([]);
  }, []);

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
  };
}

