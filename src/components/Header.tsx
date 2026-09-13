import { Code2, GitCommitHorizontal, Save, TerminalSquare } from "lucide-react";
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
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800/90 bg-[#0f1217] px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-md bg-blue-500/15 text-blue-300">
          <Code2 aria-hidden="true" className="size-4" />
        </div>
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink className="font-semibold text-slate-100">AI Code Editor</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-blue-400" />
                <Badge variant="outline" className="truncate border-slate-700/80 px-1.5 py-0 text-[10px]">{repositoryName}</Badge>
              </span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <span className="truncate text-[13px] font-semibold text-slate-100 sm:hidden">AI Code Editor</span>
        <Separator orientation="vertical" className="my-1 hidden h-5 sm:block" />
        <Select aria-label="Repository" defaultValue={repositoryName} className="hidden h-7 max-w-32 sm:block">
          <option value={repositoryName}>{repositoryName}</option>
          <option value="coming-soon">Other repositories (soon)</option>
        </Select>
      </div>

      <div className="flex items-center gap-1.5">
        <Tooltip label="Open command menu (⌘K)">
          <Button variant="ghost" size="icon" onClick={onCommandOpen} aria-label="Open command menu">
            <TerminalSquare aria-hidden="true" className="size-3.5" />
          </Button>
        </Tooltip>
        <Tooltip label={hasModifiedFile ? "Save changes" : "No changes to save"}>
          <Button
            variant={hasModifiedFile ? "default" : "ghost"}
            onClick={onSave}
            disabled={!hasModifiedFile}
            aria-label="Save changes"
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
          >
            <GitCommitHorizontal aria-hidden="true" className="size-3.5" />
            Commit
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
