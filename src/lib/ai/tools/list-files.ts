import { tool } from "ai";
import { z } from "zod";
import type { AIWorkspace } from "../workspace";

export function createListFilesTool(workspace: AIWorkspace) {
  return tool({
    description: "List the files currently available in the editor workspace.",
    inputSchema: z.object({}),
    execute: async () => ({
      files: workspace.files.map((file) => ({
        path: file.path,
        language: file.language ?? "text",
        isModified: Boolean(file.isModified),
      })),
    }),
  });
}
