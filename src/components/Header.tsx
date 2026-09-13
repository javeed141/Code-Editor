"use client";

import { Code2, GitCommitHorizontal, Moon, Save, Sun, TerminalSquare } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/src/components/ui/breadcrumb";
import { Separator } from "@/src/components/ui/separator";
import { Select } from "@/src/components/ui/select";
import { Tooltip } from "@/src/components/ui/tooltip";
import { useTheme } from "@/src/context/ThemeContext";

type HeaderProps = {
  repositoryName: string;
  hasModifiedFile: boolean;
  onSave: () => void;
  onCommandOpen: () => void;
};

export default function Header({
  repositoryName,
  hasModifiedFile,
  onSave,
  onCommandOpen,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

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
                <Badge variant="outline" className="truncate border-[var(--border-color)] px-1.5 py-0 text-[10px]">
                  {repositoryName}
                </Badge>
              </span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <span className="truncate text-xs font-semibold text-[var(--foreground)] sm:hidden">
          AI Code Editor
        </span>
        <Separator orientation="vertical" className="my-1 hidden h-4 sm:block" />
        <Select aria-label="Repository" defaultValue={repositoryName} className="hidden h-6 max-w-32 text-[11px] sm:block">
          <option value={repositoryName}>{repositoryName}</option>
          <option value="coming-soon">Other repositories (soon)</option>
        </Select>
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
          <Button variant="ghost" size="icon" onClick={onCommandOpen} aria-label="Open command menu" className="size-7">
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
        <Tooltip label="GitHub integration is coming later">
          <Button
            variant="outline"
            disabled
            aria-label="Commit changes (unavailable)"
            className="h-7"
          >
            <GitCommitHorizontal aria-hidden="true" className="size-3.5" />
            Commit
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
