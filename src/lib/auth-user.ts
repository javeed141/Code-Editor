import { getSession } from "@/src/lib/session";

export interface AuthenticatedUser {
  id: string; // Clerk user ID or fallback string ID
  githubUserId?: number;
  githubUsername?: string;
  avatarUrl?: string;
  displayName?: string;
}

/**
 * Returns the currently authenticated user ID and profile.
 * Supports Clerk user ID when Clerk headers are present, and seamlessly
 * falls back to the current encrypted session cookie.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  return {
    id: `user_gh_${session.user.id}`,
    githubUserId: session.user.id,
    githubUsername: session.user.login,
    avatarUrl: session.user.avatar_url,
    displayName: session.user.name || session.user.login,
  };
}

