import { tool } from "ai";
import { z } from "zod";
import { getWorkspaceFile, type AIWorkspace } from "../workspace";

export function createReadFileTool(workspace: AIWorkspace) {
  return tool({
    description: "Read a text file from the current editor workspace.",
    inputSchema: z.object({
      path: z.string().describe("Relative path of the workspace file to read"),
    }),
    execute: async ({ path }) => {
      const file = getWorkspaceFile(workspace, path);
      return { path: file.path, content: file.content };
    },
  });
}
