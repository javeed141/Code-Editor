"use client";

import {
  Code2,
  ExternalLink,
  FolderGit2,
  GitCommitHorizontal,
  LogOut,
  Moon,
  Save,
  Sun,
  TerminalSquare,
  User as UserIcon,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/src/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Separator } from "@/src/components/ui/separator";
import { Tooltip } from "@/src/components/ui/tooltip";
import { useTheme } from "@/src/context/ThemeContext";
import type { GitHubUser, SelectedRepository } from "@/src/types/github";

type HeaderProps = {
  repositoryName: string;
  hasModifiedFile: boolean;
  changedCount: number;
  onSave: () => void;
  onCommit: () => void;
  onCommandOpen: () => void;
  user: GitHubUser | null;
  authLoading: boolean;
  selectedRepository: SelectedRepository | null;
  hasMultipleRepos: boolean;
  installationId?: number;
  onOpenRepoModal: () => void;
  onLogout: () => void;
  onSignIn: () => void;
};

function GitHubLogo({ className = "size-3.5" }: { className?: string }) {
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

export default function Header({
  repositoryName,
  hasModifiedFile,
  changedCount,
  onSave,
  onCommit,
  onCommandOpen,
  user,
  authLoading,
  selectedRepository,
  hasMultipleRepos,
  installationId,
  onOpenRepoModal,
  onLogout,
  onSignIn,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const manageReposUrl = installationId
    ? `https://github.com/settings/installations/${installationId}`
    : "https://github.com/settings/installations";

  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--border-color)] bg-[var(--titlebar-bg)] px-3 text-[var(--foreground)] sm:px-4 select-none">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-6 items-center justify-center rounded-[3px] bg-[#007acc] text-white shadow-xs">
          <Code2 aria-hidden="true" className="size-3.5" />
        </div>
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="font-semibold text-[var(--foreground)]">
                AI Code Editor
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#007acc]" />
                <Badge
                  variant="outline"
                  className="truncate border-[var(--border-color)] px-1.5 py-0 text-[10px]"
                  title={selectedRepository ? `${selectedRepository.owner}/${selectedRepository.repo}` : repositoryName}
                >
                  {selectedRepository ? `${selectedRepository.owner}/${selectedRepository.repo}` : repositoryName}
                </Badge>
              </span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <span className="truncate text-xs font-semibold text-[var(--foreground)] sm:hidden">
          AI Code Editor
        </span>

        {user && hasMultipleRepos && (
          <>
            <Separator orientation="vertical" className="my-1 hidden h-4 sm:block" />
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenRepoModal}
              className="hidden h-6 gap-1 px-2 text-[11px] sm:inline-flex"
            >
              <FolderGit2 className="size-3 text-[#007acc]" />
              <span className="max-w-[130px] truncate">
                {selectedRepository ? selectedRepository.repo : "Select Repository..."}
              </span>
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Tooltip label={`Switch to ${theme === "dark" ? "Light" : "Dark"} theme`}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="size-7"
          >
            {theme === "dark" ? (
              <Sun aria-hidden="true" className="size-3.5 text-amber-400" />
            ) : (
              <Moon aria-hidden="true" className="size-3.5 text-slate-700" />
            )}
          </Button>
        </Tooltip>

        <Tooltip label="Open command menu (⌘K)">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCommandOpen}
            aria-label="Open command menu"
            className="size-7"
          >
            <TerminalSquare aria-hidden="true" className="size-3.5" />
          </Button>
        </Tooltip>

        <Tooltip label={hasModifiedFile ? "Save changes" : "No changes to save"}>
          <Button
            variant={hasModifiedFile ? "default" : "ghost"}
            onClick={onSave}
            disabled={!hasModifiedFile}
            aria-label="Save changes"
            className="h-7"
          >
            <Save aria-hidden="true" className="size-3.5" />
            Save
          </Button>
        </Tooltip>

        <Tooltip
          label={
            changedCount > 0
              ? `Commit ${changedCount} changed file${changedCount !== 1 ? "s" : ""} to GitHub`
              : "No changed files to commit"
          }
        >
          <Button
            variant={changedCount > 0 ? "default" : "outline"}
            onClick={onCommit}
            disabled={changedCount === 0}
            aria-label={changedCount > 0 ? `Commit ${changedCount} changes` : "No changes to commit"}
            className={`h-7 gap-1.5 ${
              changedCount > 0
                ? "bg-[#238636] hover:bg-[#2ea043] text-white border-0"
                : ""
            }`}
          >
            <GitCommitHorizontal aria-hidden="true" className="size-3.5" />
            {changedCount > 0 ? `Commit changes (${changedCount})` : "Commit changes"}
          </Button>
        </Tooltip>

        <Separator orientation="vertical" className="my-1 mx-0.5 h-4" />

        {/* GitHub Authentication Button or User Menu */}
        {authLoading ? (
          <div className="flex h-7 w-20 items-center justify-center">
            <span className="size-3.5 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-[#007acc]" />
          </div>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-7 items-center gap-1.5 rounded-[3px] border border-[var(--border-color)] bg-[var(--card-bg)] px-2 py-0.5 text-xs text-[var(--foreground)] hover:bg-[var(--list-hover)]">
              <Avatar className="size-4.5 rounded-full overflow-hidden bg-[#007acc]">
                {user.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatar_url} alt={user.login} className="size-full object-cover" />
                ) : (
                  <AvatarFallback className="text-[9px]">
                    <UserIcon className="size-2.5" />
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="max-w-[80px] truncate font-medium sm:max-w-[100px]">
                {user.login}
              </span>
              <span className="text-[10px] opacity-60">▼</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="right" className="w-52">
              <DropdownMenuLabel>
                <p className="text-[10px] font-normal text-[var(--text-muted)]">Signed in as</p>
                <p className="truncate font-semibold text-[var(--foreground)]">@{user.login}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hasMultipleRepos && (
                <DropdownMenuItem onClick={onOpenRepoModal}>
                  <FolderGit2 className="mr-2 size-3.5 text-[#007acc]" />
                  <span>Switch Repository...</span>
                </DropdownMenuItem>
              )}
              <a
                href={manageReposUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full block"
              >
                <DropdownMenuItem>
                  <ExternalLink className="mr-2 size-3.5 text-[var(--text-muted)]" />
                  <span>Change Repos on GitHub</span>
                </DropdownMenuItem>
              </a>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-400 hover:text-red-300">
                <LogOut className="mr-2 size-3.5" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={onSignIn}
            className="h-7 gap-1.5 bg-[#24292e] text-white hover:bg-[#2f363d] dark:bg-[#238636] dark:hover:bg-[#2ea043]"
          >
            <GitHubLogo className="size-3.5" />
            <span>Sign in with GitHub</span>
          </Button>
        )}
      </div>
    </header>
  );
}
