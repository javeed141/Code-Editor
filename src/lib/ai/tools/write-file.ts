import { tool } from "ai";
import { z } from "zod";
import { getWorkspaceFile, normalizeWorkspacePath, type AIWorkspace } from "../workspace";

export function createWriteFileTool(workspace: AIWorkspace) {
  return tool({
    description:
      "Prepare a proposed file update. This does not write to disk or GitHub; show the proposal to the user for review.",
    inputSchema: z.object({
      path: z.string().describe("Relative path of the workspace file to update"),
      content: z.string().describe("Complete proposed content of the file"),
    }),
    execute: async ({ path, content }) => {
      const safePath = normalizeWorkspacePath(path);
      const existingFile = getWorkspaceFile(workspace, safePath);

      return {
        success: false,
        proposed: true,
        path: existingFile.path,
        content,
        message:
          "File content prepared for review. No local or repository files were modified.",
      };
    },
  });
}
