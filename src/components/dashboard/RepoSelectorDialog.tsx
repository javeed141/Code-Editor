import { useState } from "react";
import { ExternalLink, FolderGit2, Lock, Search, X } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
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
import { Input } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import type { Repository, SelectedRepository } from "@/src/types/github";

interface RepoSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositories: Repository[];
  reposLoading: boolean;
  reposError: string | null;
  reposAuthExpired: boolean;
  selectedRepository: SelectedRepository | null;
  installationId?: number;
  onSelectRepository: (repo: Repository) => void;
  onRetry: () => void;
  onReconnect: () => void;
}

export function RepoSelectorDialog({
  open,
  onOpenChange,
  repositories,
  reposLoading,
  reposError,
  reposAuthExpired,
  selectedRepository,
  installationId,
  onSelectRepository,
  onRetry,
  onReconnect,
}: RepoSelectorDialogProps) {
  const [repositoryQuery, setRepositoryQuery] = useState("");

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      setRepositoryQuery("");
    }
  };

  const normalizedRepositoryQuery = repositoryQuery.trim().toLowerCase();
  const filteredRepositories = normalizedRepositoryQuery
    ? repositories.filter((repo) =>
        [repo.fullName, repo.defaultBranch].some((value) =>
          value.toLowerCase().includes(normalizedRepositoryQuery),
        ),
      )
    : repositories;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="mx-auto flex w-full max-w-[44rem] flex-col overflow-hidden rounded-lg border-[var(--border-color)] p-0 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <DialogHeader className="mb-0 flex shrink-0 flex-row items-start justify-between gap-4 border-b border-[var(--border-color)] bg-[var(--card-header-bg)] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-3 text-[15px]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-color)] text-white shadow-sm">
                <FolderGit2 className="size-4" />
              </span>
              Switch repository
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-lg">
              Select one of the GitHub repositories this editor is allowed to access.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close repository selector"
            className="size-8 rounded-md"
            onClick={() => handleOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </DialogHeader>
        <Command className="flex min-h-0 flex-1 flex-col rounded-none border-0 shadow-none">
          <div className="relative shrink-0 px-5 pt-4 sm:px-6">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-8 top-9 size-4 -translate-y-1/2 text-[var(--text-muted)] sm:left-9"
            />
            <Input
              value={repositoryQuery}
              onChange={(event) => setRepositoryQuery(event.target.value)}
              placeholder="Search repositories or branches..."
              aria-label="Search repositories"
              autoFocus
              className="h-10 rounded-md pl-9 pr-3 text-sm shadow-inner focus:border-[var(--accent-color)] focus:ring-[var(--accent-color)]"
            />
          </div>
          <CommandList className="min-h-0 max-h-none flex-1 px-5 pb-5 pt-4 sm:px-6">
            {reposLoading ? (
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between p-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-3.5 rounded-[2px]" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                  <Skeleton className="h-3.5 w-12" />
                </div>
                <div className="flex items-center justify-between p-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-3.5 rounded-[2px]" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="h-3.5 w-12" />
                </div>
                <div className="flex items-center justify-between p-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-3.5 rounded-[2px]" />
                    <Skeleton className="h-4 w-52" />
                  </div>
                  <Skeleton className="h-3.5 w-12" />
                </div>
              </div>
            ) : reposError ? (
              <div className="space-y-3 px-3 py-6 text-center">
                <p className="text-sm text-[var(--text-muted)]">{reposError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={reposAuthExpired ? onReconnect : onRetry}
                >
                  {reposAuthExpired ? "Reconnect GitHub" : "Try again"}
                </Button>
              </div>
            ) : repositories.length === 0 ? (
              <CommandEmpty>No repositories found. Check this app&apos;s repository access in GitHub, then try again.</CommandEmpty>
            ) : filteredRepositories.length === 0 ? (
              <CommandEmpty>
                No repositories match <span className="font-medium text-[var(--foreground)]">“{repositoryQuery}”</span>.
              </CommandEmpty>
            ) : (
              <CommandGroup heading="Permitted GitHub Repositories" className="mb-0">
                {filteredRepositories.map((repo) => {
                  const isCurrentRepository =
                    selectedRepository?.owner === repo.ownerLogin &&
                    selectedRepository.repo === repo.name;
                  return (
                    <CommandItem
                      key={repo.id}
                      onClick={() => {
                        onSelectRepository(repo);
                        handleOpenChange(false);
                      }}
                      aria-current={isCurrentRepository ? "true" : undefined}
                      className={
                        isCurrentRepository
                          ? "mb-2 min-h-[72px] items-center gap-3 rounded-md border border-[var(--accent-color)] bg-[var(--list-active)] px-4 py-3 last:mb-0"
                          : "mb-2 min-h-[72px] items-center gap-3 rounded-md border border-[var(--border-color)] bg-[var(--editor-bg)] px-4 py-3 last:mb-0 hover:border-[var(--accent-color)] hover:bg-[var(--list-hover)]"
                      }
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-color)]/15 text-[var(--accent-color)]">
                        <FolderGit2 className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{repo.fullName}</span>
                        <span className="mt-1 block truncate font-mono text-[10px] text-[var(--text-muted)]">
                          default branch: {repo.defaultBranch}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {repo.private && (
                          <Badge variant="outline" className="hidden gap-1 border-[var(--border-color)] px-1.5 py-0 text-[9px] sm:inline-flex">
                            <Lock className="size-2.5" /> Private
                          </Badge>
                        )}
                        {isCurrentRepository && (
                          <Badge className="border-[var(--accent-color)]/30 bg-[var(--accent-color)]/15 px-1.5 py-0 text-[9px] text-[var(--accent-color)]">
                            Current
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--border-color)] bg-[var(--card-header-bg)] px-5 py-3.5 sm:px-6">
            <span className="text-[10px] text-[var(--text-muted)]">
              Repository access is managed in GitHub.
            </span>
            <a
              href={
                installationId
                  ? "https://github.com/settings/installations/" + installationId
                  : "https://github.com/settings/installations"
              }
              target="_blank"
              rel="noreferrer"
              className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-[var(--accent-color)] hover:underline"
            >
              <span className="hidden sm:inline">Manage access</span>
              <span className="sm:hidden">Manage</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
