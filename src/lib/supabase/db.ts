import { getSupabaseServerClient } from "./server";
import type { Database } from "./types";

type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

/**
 * Upserts a user in the Supabase `users` table matching their Clerk User ID.
 */
export async function upsertUser(user: UserInsert) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email,
        github_user_id: user.github_user_id,
        github_username: user.github_username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting user in Supabase:", error);
    return null;
  }

  return data;
}

/**
 * Fetches a user by their Clerk User ID.
 */
export async function getUser(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user from Supabase:", error);
    return null;
  }

  return data;
}

/**
 * Saves or updates a user's active workspace (repository & selected branch).
 */
export async function upsertWorkspace(
  userId: string,
  repoOwner: string,
  repoName: string,
  selectedBranch: string,
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("workspaces")
    .upsert(
      {
        user_id: userId,
        repo_owner: repoOwner,
        repo_name: repoName,
        selected_branch: selectedBranch,
        last_opened_at: new Date().toISOString(),
      },
      { onConflict: "user_id,repo_owner,repo_name" },
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting workspace in Supabase:", error);
    return null;
  }

  return data;
}

/**
 * Fetches the most recently opened workspace for a user.
 */
export async function getRecentWorkspace(userId: string) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("workspaces")
    .select()
    .eq("user_id", userId)
    .order("last_opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching recent workspace from Supabase:", error);
    return null;
  }

  return data;
}

/**
 * Fetches or creates an AI chat conversation for a specific repository and branch.
 */
export async function getOrCreateConversation(
  userId: string,
  repository: string,
  branch: string,
  workspaceId?: string | null,
) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  // Check for an existing conversation for this user + repo + branch
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select()
    .eq("user_id", userId)
    .eq("repository", repository)
    .eq("branch", branch)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("Error finding conversation:", findError);
  }

  if (existing) {
    return existing;
  }

  // Create new conversation
  const { data: created, error: createError } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      workspace_id: workspaceId || null,
      repository,
      branch,
      title: `${repository} (${branch})`,
    })
    .select()
    .single();

  if (createError) {
    console.error("Error creating conversation in Supabase:", createError);
    return null;
  }

  return created;
}
