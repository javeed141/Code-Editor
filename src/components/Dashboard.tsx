"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  FolderGit2,
  Lock,
  X,
  FileWarning,
} from "lucide-react";
import ChatPanel from "@/src/components/ChatPanel";
import CodeEditor from "@/src/components/CodeEditor";
import CommitDialog from "@/src/components/CommitDialog";
import type { ChangedFile } from "@/src/components/CommitDialog";
import EditorStatusBar from "@/src/components/EditorStatusBar";
import FileExplorer from "@/src/components/FileExplorer";
import FileIcon from "@/src/components/FileIcon";
import Header from "@/src/components/Header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/src/components/ui/breadcrumb";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/src/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/src/components/ui/resizable";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Badge } from "@/src/components/ui/badge";
import { mockRepository } from "@/src/data/mockRepository";
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
import type { GitHubUser, Repository, SelectedRepository } from "@/src/types/github";

const SELECTED_REPOSITORY_STORAGE_KEY = "ai-code-editor-selected-repository";

function createOpenFile(
  path: string,
  content: string,
  name: string,
  options?: { isBinary?: boolean; isTooLarge?: boolean; message?: string; sha?: string },
): OpenFile {
  return {
    path,
    name,
    language: getLanguageFromPath(path),
    originalContent: content,
    content,
    isModified: false,
    sha: options?.sha,
    isBinary: options?.isBinary,
    isTooLarge: options?.isTooLarge,
    message: options?.message,
  };
}

export default function Dashboard() {
  // Authentication & GitHub state
  const [authenticatedUser, setAuthenticatedUser] = useState<GitHubUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [installationId, setInstallationId] = useState<number | undefined>(undefined);
  const [selectedRepository, setSelectedRepository] = useState<SelectedRepository | null>(null);
  const [repositoryTree, setRepositoryTree] = useState<RepoFile[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [fileLoading] = useState(false);
  const [repoModalOpen, setRepoModalOpen] = useState(false);

  // Editor tabs & file state
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>({});
  const [commandOpen, setCommandOpen] = useState(false);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);

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

    const readme = cachedFiles.find((file) => file.name.toLowerCase() === "readme.md");
    if (readme?.content !== undefined) {
      setOpenFiles({
        [readme.path]: createOpenFile(readme.path, readme.content ?? "", readme.name, {
          sha: readme.sha,
          isBinary: readme.isBinary,
        }),
      });
      setSelectedPath(readme.path);
    }

    return true;
  }, []);

  // Select a repository & fetch its Git tree recursively
  const handleSelectRepository = useCallback(async (repo: Repository, forceRefresh = false) => {
    setRepoModalOpen(false);
    setTreeLoading(true);
    setOpenFiles({});
    setSelectedPath(null);
    setSelectedRepository(null);

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
        const snapshotTree: RepoFile[] = Array.isArray(data.tree) ? data.tree : [];
        const files = Array.isArray(data.files) ? data.files : [];
        const snapshotId = getRepositorySnapshotId(repo.ownerLogin, repo.name, repo.defaultBranch);

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
          files.map((file: { path: string; name: string; content: string; sha?: string; size?: number; language?: string; isBinary?: boolean }) => ({
            id: `${snapshotId}:${file.path}`,
            snapshotId,
            path: file.path,
            name: file.name,
            type: "file",
            content: file.content,
            sha: file.sha,
            size: file.size,
            language: file.language,
            isBinary: file.isBinary,
            updatedAt: Date.now(),
          })),
        );

        setRepositoryTree(snapshotTree);
        setSelectedRepository({
          ...initialRepo,
          branch: repo.defaultBranch,
          headSha: data.repository?.headSha || data.headSha || "",
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
        visit(snapshotTree);

        const readme = flattenedFiles.find(
          (file) => file.type === "file" && file.name.toLowerCase() === "readme.md",
        );

        if (readme?.content !== undefined) {
          const nextFile = createOpenFile(
            readme.path,
            readme.content ?? "",
            readme.name,
            {
              sha: readme.sha,
              isBinary: readme.isBinary,
            },
          );
          setOpenFiles({ [readme.path]: nextFile });
          setSelectedPath(readme.path);
        }
      } else {
        const errData = await res.json();
        console.error("Branch snapshot fetch failed:", errData.error);
        setRepositoryTree([]);
      }
    } catch (err) {
      console.error("Error fetching repository snapshot:", err);
      setRepositoryTree([]);
    } finally {
      setTreeLoading(false);
    }
  }, [loadCachedSnapshot]);

  // Fetch repositories and auto-select if only 1 is granted by the user on GitHub
  const fetchRepositories = useCallback(async () => {
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
    }
  }, [handleSelectRepository]);

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

  // Check current session on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setAuthenticatedUser(data.user);
            fetchRepositories();
          } else {
            // Unauthenticated fallback
            setRepositoryTree(mockRepository);
            const fallbackPath = "src/server.js";
            const fallbackFile = findFileByPath(mockRepository, fallbackPath);
            if (fallbackFile?.content !== undefined) {
              setOpenFiles({
                [fallbackPath]: createOpenFile(fallbackPath, fallbackFile.content, fallbackFile.name),
              });
              setSelectedPath(fallbackPath);
            }
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setAuthLoading(false);
      }
    }

    checkAuth();
  }, [fetchRepositories]);

  // Handle tree node file click
  async function handleFileSelect(path: string) {
    if (openFiles[path]) {
      setSelectedPath(path);
      return;
    }

    if (selectedRepository) {
      const snapshotFile = findFileByPath(repositoryTree, path);
      if (snapshotFile?.content !== undefined) {
        setOpenFiles((current) => ({
          ...current,
          [path]: createOpenFile(path, snapshotFile.content ?? "", snapshotFile.name, {
            sha: snapshotFile.sha,
            isBinary: snapshotFile.isBinary,
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
    setOpenFiles((current) => ({
      ...current,
      [path]: createOpenFile(path, file.content ?? "", file.name),
    }));
    setSelectedPath(path);
  }

  // Refresh current repository tree
  function handleRefreshTree() {
    if (selectedRepository) {
      const repoMatch = repositories.find(
        (r) => r.ownerLogin === selectedRepository.owner && r.name === selectedRepository.repo,
      );
      if (repoMatch) {
        handleSelectRepository(repoMatch, true);
      }
    }
  }

  // Close open tab
  function handleCloseTab(path: string) {
    setOpenFiles((current) => {
      const next = { ...current };
      delete next[path];

      if (selectedPath === path) {
        const remainingKeys = Object.keys(next);
        setSelectedPath(remainingKeys.length > 0 ? remainingKeys[remainingKeys.length - 1] : null);
      }

      return next;
    });
  }

  function handleContentChange(content: string) {
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
  }

  const handleSave = useCallback(() => {
    if (!selectedPath) return;
    setOpenFiles((current) => {
      const file = current[selectedPath];
      if (!file) return current;
      return {
        ...current,
        [selectedPath]: {
          ...file,
          // Keep the GitHub version as the baseline. "Save" only preserves
          // the current editor value; committing is what clears Git changes.
          content: file.content,
          isModified: file.content !== file.originalContent,
        },
      };
    });
  }, [selectedPath]);

  function handleDiscard() {
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
  }

  /**
   * Called by CommitDialog after a successful GitHub commit.
   * Marks every committed file as clean, updates originalContent and headSha.
   */
  function handleCommitSuccess(
    _commitSha: string,
    newHeadSha: string,
    committedFiles: ChangedFile[],
  ) {
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
  }

  // Sign out and clear ALL browser data
  async function handleLogout() {
    // 1. Tell the server to expire the session cookie
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors — still continue cleanup
    }

    // 2. Clear all in-memory React state
    setAuthenticatedUser(null);
    setSelectedRepository(null);
    setRepositories([]);
    setInstallationId(undefined);
    setOpenFiles({});
    setSelectedPath(null);
    setRepositoryTree([]);

    // 3. Nuke every client-readable cookie (HttpOnly cookies are handled server-side above)
    try {
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.split("=")[0].trim();
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    } catch {
      // ignore
    }

    // 4. Clear ALL sessionStorage and localStorage (keep theme preference only)
    try {
      sessionStorage.clear();
      const currentTheme = localStorage.getItem("ai-code-editor-theme");
      localStorage.clear();
      if (currentTheme) {
        localStorage.setItem("ai-code-editor-theme", currentTheme);
      }
    } catch {
      // ignore storage errors
    }

    // 5. Hard redirect to home — full page reload so no stale JS state remains
    window.location.replace("/");
  }

  // Keybindings (Cmd/Ctrl + K, Cmd/Ctrl + S)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  const selectedFile = selectedPath ? openFiles[selectedPath] : undefined;

  return (
    <main className="flex h-screen min-h-[520px] flex-col overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Header
        repositoryName={selectedRepository ? selectedRepository.repo : "demo-project"}
        hasModifiedFile={Boolean(selectedFile?.isModified)}
        changedCount={changedFiles.length}
        onSave={handleSave}
        onCommit={() => setCommitDialogOpen(true)}
        onCommandOpen={() => setCommandOpen(true)}
        user={authenticatedUser}
        authLoading={authLoading}
        selectedRepository={selectedRepository}
        hasMultipleRepos={repositories.length > 1}
        installationId={installationId}
        onOpenRepoModal={() => setRepoModalOpen(true)}
        onLogout={handleLogout}
      />

      <ResizablePanelGroup className="flex-1 flex-row">
        <ResizablePanel defaultSize={20} className="max-[1120px]:min-w-0">
          <FileExplorer
            files={repositoryTree}
            selectedPath={selectedPath}
            openFiles={openFiles}
            onFileSelect={handleFileSelect}
            isAuthenticated={Boolean(authenticatedUser)}
            selectedRepository={selectedRepository}
            repoLoading={treeLoading}
            onRefresh={handleRefreshTree}
            onOpenRepoModal={() => setRepoModalOpen(true)}
          />
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={55}>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--editor-bg)]">
            {fileLoading ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center select-none bg-[var(--editor-bg)]">
                <Skeleton className="mb-3 size-10 rounded-[4px] opacity-50" />
                <p className="text-xs text-[var(--text-muted)]">Loading file from GitHub...</p>
              </div>
            ) : selectedFile ? (
              <>
                <div className="flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-color)] bg-[var(--tabbar-bg)] px-3 select-none">
                  <Breadcrumb className="min-w-0">
                    <BreadcrumbList>
                      {selectedFile.path.split("/").map((part, index, parts) => (
                        <span key={`${part}-${index}`} className="flex min-w-0 items-center">
                          {index > 0 && <BreadcrumbSeparator />}
                          <BreadcrumbItem>
                            {index === parts.length - 1 ? (
                              <BreadcrumbPage className="flex items-center gap-1.5 text-[var(--foreground)]">
                                <FileIcon name={part} className="size-3.5" />
                                {part}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink className="text-[var(--text-muted)] hover:text-[var(--foreground)]">
                                {part}
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </span>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                  <div className="flex items-center gap-2">
                    {selectedFile.isModified && (
                      <Badge className="gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-500 dark:text-amber-300">
                        <span className="size-1.5 rounded-full bg-amber-400" />
                        Modified
                      </Badge>
                    )}
                    <Badge variant="secondary" className="hidden px-1.5 py-0 text-[10px] sm:inline-flex">
                      {selectedFile.language}
                    </Badge>
                  </div>
                </div>

                <Tabs
                  value={selectedPath ?? ""}
                  onValueChange={setSelectedPath}
                  className="shrink-0 border-b border-[var(--border-color)] bg-[var(--tabbar-bg)]"
                >
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {Object.values(openFiles).map((file) => (
                      <TabsTrigger key={file.path} value={file.path} className="group pr-2">
                        <FileIcon name={file.name} className="size-3.5" />
                        <span className="max-w-[140px] truncate">{file.name}</span>
                        {file.isModified ? (
                          <span className="size-2 rounded-full bg-amber-400 group-hover:hidden" />
                        ) : null}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTab(file.path);
                          }}
                          className={`rounded-[2px] p-0.5 text-[var(--text-muted)] hover:bg-[rgba(128,128,128,0.25)] hover:text-[var(--foreground)] ${
                            file.isModified ? "hidden group-hover:inline-flex" : "opacity-0 group-hover:opacity-100"
                          }`}
                          aria-label={`Close ${file.name}`}
                        >
                          <X className="size-3" />
                        </button>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="min-h-0 flex-1">
                  {selectedFile.isBinary ? (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center select-none bg-[var(--editor-bg)] h-full">
                      <FileWarning className="mb-3 size-12 text-amber-400/80" />
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        {selectedFile.name}
                      </h3>
                      <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                        {selectedFile.message || "Binary file — preview unavailable"}
                      </p>
                    </div>
                  ) : selectedFile.isTooLarge ? (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center select-none bg-[var(--editor-bg)] h-full">
                      <FileWarning className="mb-3 size-12 text-red-400/80" />
                      <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        {selectedFile.name}
                      </h3>
                      <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                        {selectedFile.message || "This file is too large to preview."}
                      </p>
                    </div>
                  ) : (
                    <CodeEditor
                      path={selectedFile.path}
                      value={selectedFile.content}
                      language={selectedFile.language}
                      onChange={handleContentChange}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center select-none bg-[var(--editor-bg)]">
                <div>
                  <Skeleton className="mx-auto mb-3 size-10 rounded-[4px] opacity-40" />
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {selectedRepository ? "No file selected" : "Loading your repository..."}
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                    {selectedRepository
                      ? "Select a file from the explorer to view its code."
                      : "Connecting to GitHub repository."}
                  </p>
                </div>
              </div>
            )}
          </section>
        </ResizablePanel>

        <ResizableHandle className="max-[800px]:hidden" />

        <ResizablePanel defaultSize={25} className="max-[800px]:hidden">
          <ChatPanel />
        </ResizablePanel>
      </ResizablePanelGroup>

      <EditorStatusBar
        fileName={selectedFile?.name ?? null}
        language={selectedFile?.language ?? null}
        isModified={Boolean(selectedFile?.isModified)}
        canDiscard={Boolean(selectedFile?.isModified)}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      {selectedRepository && (
        <CommitDialog
          open={commitDialogOpen}
          onOpenChange={setCommitDialogOpen}
          changedFiles={changedFiles}
          selectedRepository={selectedRepository}
          onCommitSuccess={handleCommitSuccess}
          onRefreshRepository={handleRefreshTree}
        />
      )}

      {/* Quick Command Menu (Cmd/Ctrl + K) */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Command menu</DialogTitle>
            <DialogDescription>Quick actions for the editor</DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Search files or actions..." aria-label="Search commands" />
            <CommandList>
              {repositories.length > 1 && (
                <CommandGroup heading="Repository">
                  <CommandItem
                    onClick={() => {
                      setCommandOpen(false);
                      setRepoModalOpen(true);
                    }}
                  >
                    <FolderGit2 className="mr-2 size-3.5 text-[#007acc]" />
                    <span>Switch Repository...</span>
                  </CommandItem>
                </CommandGroup>
              )}
              <CommandGroup heading="Open Files">
                {Object.values(openFiles).map((item) => (
                  <CommandItem
                    key={item.path}
                    onClick={() => {
                      setCommandOpen(false);
                      setSelectedPath(item.path);
                    }}
                  >
                    <FileIcon name={item.name} className="mr-2 size-3.5" />
                    <span>{item.path}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Repository Selector Search Dialog (Only needed if user granted multiple repos) */}
      <Dialog open={repoModalOpen} onOpenChange={setRepoModalOpen}>
        <DialogContent className="p-0 max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Select Repository</DialogTitle>
            <DialogDescription>Choose a GitHub repository to load</DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Search your granted repositories..." aria-label="Search repositories" />
            <CommandList className="max-h-80">
              {repositories.length === 0 ? (
                <CommandEmpty>No repositories found.</CommandEmpty>
              ) : (
                <CommandGroup heading="Permitted GitHub Repositories">
                  {repositories.map((repo) => (
                    <CommandItem
                      key={repo.id}
                      onClick={() => handleSelectRepository(repo)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2 className="size-3.5 text-[#007acc] shrink-0" />
                        <span className="truncate font-medium">{repo.fullName}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {repo.private && (
                          <Badge variant="outline" className="gap-1 border-[var(--border-color)] text-[9px] px-1 py-0">
                            <Lock className="size-2.5" /> Private
                          </Badge>
                        )}
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {repo.defaultBranch}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <div className="p-2 border-t border-[var(--border-color)]">
                <a
                  href={
                    installationId
                      ? `https://github.com/settings/installations/${installationId}`
                      : "https://github.com/settings/installations"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-[#007acc] hover:underline py-1"
                >
                  <ExternalLink className="size-3" />
                  <span>Change or add repositories on GitHub</span>
                </a>
              </div>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </main>
  );
}
