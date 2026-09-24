import type { AIWorkspace } from "../workspace";
import { createListFilesTool } from "./list-files";
import { createReadFileTool } from "./read-file";
import { createWriteFileTool } from "./write-file";

export function createWorkspaceTools(workspace: AIWorkspace) {
  return {
    listFiles: createListFilesTool(workspace),
    readFile: createReadFileTool(workspace),
    writeFile: createWriteFileTool(workspace),
  };
}

export { createListFilesTool as listFiles } from "./list-files";
export { createReadFileTool as readFile } from "./read-file";
export { createWriteFileTool as writeFile } from "./write-file";
