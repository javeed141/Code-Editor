import { Check, CircleAlert, RotateCcw, Save } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Separator } from "@/src/components/ui/separator";
import { Tooltip } from "@/src/components/ui/tooltip";

type EditorStatusBarProps = {
  fileName: string | null;
  language: string | null;
  isModified: boolean;
  canDiscard: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export default function EditorStatusBar({
  fileName,
  language,
  isModified,
  canDiscard,
  onSave,
  onDiscard,
}: EditorStatusBarProps) {
  return (
    <footer className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-slate-800/90 bg-[#0f1217] px-3 text-[10px] sm:px-4">
      <div className="flex min-w-0 items-center gap-3 text-slate-500">
        <Badge variant="outline" className={`gap-1.5 px-1.5 py-0 ${isModified ? "border-amber-400/30 text-amber-300" : "border-emerald-400/30 text-emerald-300"}`}>
          {isModified ? <CircleAlert aria-hidden="true" className="size-3 text-amber-300" /> : <Check aria-hidden="true" className="size-3 text-emerald-400" />}
          <span className="hidden sm:inline">{isModified ? "Unsaved changes" : "Saved"}</span>
        </Badge>
        {language && <><Separator orientation="vertical" className="h-3" /><Badge variant="secondary" className="hidden px-1.5 py-0 sm:inline-flex">{language}</Badge></>}
        <Tooltip label="Encoding: UTF-8">
          <span className="hidden text-slate-600 md:inline">UTF-8</span>
        </Tooltip>
        <span className="hidden text-slate-600 md:inline">Spaces: 2</span>
        {fileName && <span className="truncate text-slate-600">{fileName}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Tooltip label="Save changes">
          <Button variant="ghost" onClick={onSave} disabled={!isModified} aria-label="Save changes" className="h-6 px-1.5 text-[10px]">
            <Save aria-hidden="true" className="size-3" />
            <span className="hidden sm:inline">Save</span>
          </Button>
        </Tooltip>
        <Tooltip label="Discard changes">
          <Button variant="ghost" onClick={onDiscard} disabled={!canDiscard} aria-label="Discard changes" className="h-6 px-1.5 text-[10px]">
            <RotateCcw aria-hidden="true" className="size-3" />
            <span className="hidden sm:inline">Discard</span>
          </Button>
        </Tooltip>
      </div>
    </footer>
  );
}
