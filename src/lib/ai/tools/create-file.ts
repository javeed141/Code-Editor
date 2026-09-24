import { tool } from "ai";
import { z } from "zod";
import { normalizeWorkspacePath, type AIWorkspace } from "../workspace";

/**
 * createFile — proposes a new file for review.
 *
 * The current architecture keeps files in client state (workspace.files) and
 * commits changes to GitHub via the /api/github/commit endpoint.  Writing
 * directly to the server filesystem is not supported or desired.
 *
 * This tool therefore returns the proposed file content for the UI to display
 * as a review diff — it never touches the filesystem or the repository.
 */
export function createCreateFileTool(workspace: AIWorkspace) {
  return tool({
    description:
      "Propose the creation of a new file. The proposal is returned for user review and does not modify the repository.",
    inputSchema: z.object({
      path: z.string().describe("Relative path of the new file to create"),
      content: z.string().describe("Complete initial content of the new file"),
    }),
    execute: async ({ path, content }) => {
      const safePath = normalizeWorkspacePath(path);

      // Check whether the file already exists in the workspace
      const alreadyExists = workspace.files.some((f) => f.path === safePath);
      if (alreadyExists) {
        return {
          success: false,
          proposed: false,
          path: safePath,
          message: `File '${safePath}' already exists in the workspace. Use writeFile to update it instead.`,
        };
      }

      return {
        success: false,
        proposed: true,
        path: safePath,
        content,
        message:
          "New file content prepared for review. No local or repository files were created.",
      };
    },
  });
}