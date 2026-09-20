import { FolderGit2 } from "lucide-react";
import FileIcon from "@/src/components/FileIcon";
import {
  Command,
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
import type { OpenFile } from "@/src/types/editor";

interface CommandMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasMultipleRepos: boolean;
  openFiles: Record<string, OpenFile>;
  onOpenRepoModal: () => void;
  onSelectPath: (path: string) => void;
}

export function CommandMenuDialog({
  open,
  onOpenChange,
  hasMultipleRepos,
  openFiles,
  onOpenRepoModal,
  onSelectPath,
}: CommandMenuDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Command menu</DialogTitle>
          <DialogDescription>Quick actions for the editor</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search files or actions..." aria-label="Search commands" />
          <CommandList>
            {hasMultipleRepos && (
              <CommandGroup heading="Repository">
                <CommandItem
                  onClick={() => {
                    onOpenChange(false);
                    onOpenRepoModal();
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
                    onOpenChange(false);
                    onSelectPath(item.path);
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
  );
}

