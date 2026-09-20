import { FileWarning, FolderGit2 } from "lucide-react";
import CodeEditor from "@/src/components/CodeEditor";
import { Button } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EditorTabs } from "./EditorTabs";
import type { OpenFile } from "@/src/types/editor";
import type { SelectedRepository } from "@/src/types/github";

function GitHubIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

interface EditorAreaProps {
  isLoading: boolean;
  isGitHubConnected?: boolean;
  onConnectGitHub?: () => void;
  selectedFile?: OpenFile;
  selectedRepository: SelectedRepository | null;
  openFiles: Record<string, OpenFile>;
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
  onCloseTab: (path: string) => void;
  onContentChange: (content: string) => void;
}

export function EditorArea({
  isLoading,
  isGitHubConnected = true,
  onConnectGitHub,
  selectedFile,
  selectedRepository,
  openFiles,
  selectedPath,
  onSelectPath,
  onCloseTab,
  onContentChange,
}: EditorAreaProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--editor-bg)]">
      {isLoading ? (
        <div className="flex min-h-0 flex-1 flex-col p-6 space-y-3 select-none bg-[var(--editor-bg)]">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-2.5 pt-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ) : selectedFile ? (
        <>
          <EditorTabs
            openFiles={openFiles}
            selectedFile={selectedFile}
            selectedPath={selectedPath}
            onSelectPath={onSelectPath}
            onCloseTab={onCloseTab}
          />

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
                onChange={onContentChange}
              />
            )}
          </div>
        </>
      ) : !isGitHubConnected ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center select-none bg-[var(--editor-bg)]">
          <div className="max-w-sm">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--card-bg)] border border-[var(--border-color)]">
              <GitHubIcon className="size-6 text-[var(--foreground)]" />
            </div>
            <h3 className="text-base font-semibold text-[var(--foreground)]">
              Connect to GitHub
            </h3>
            <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
              Connect your GitHub account to access your repositories, browse files, and make edits.
            </p>
            {onConnectGitHub && (
              <Button
                onClick={onConnectGitHub}
                size="sm"
                className="mt-4 gap-2 bg-[#24292e] text-white hover:bg-[#2f363d] dark:bg-[#238636] dark:hover:bg-[#2ea043]"
              >
                <GitHubIcon className="size-4" />
                <span>Connect GitHub</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center select-none bg-[var(--editor-bg)]">
          <div>
            <FolderGit2 className="mx-auto mb-3 size-10 text-[var(--text-muted)] opacity-40" />
            <p className="text-sm font-medium text-[var(--foreground)]">
              {selectedRepository ? "No file selected" : "No repository opened"}
            </p>
            <p className="mt-1.5 text-xs text-[var(--text-muted)]">
              {selectedRepository
                ? "Select a file from the explorer to view its code."
                : "Choose a repository from the explorer on the left to start."}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
