import { currentUser } from "@clerk/nextjs/server";
import { getSession } from "@/src/lib/session";

export interface AuthenticatedUser {
  id: string; // Clerk user ID or fallback string ID
  email?: string | null;
  githubUserId?: number;
  githubUsername?: string;
  avatarUrl?: string;
  displayName?: string;
}

/**
 * Returns the currently authenticated user ID and profile.
 * Resolves Clerk user ID first, and associates connected GitHub details.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const [clerkUser, session] = await Promise.all([
    currentUser().catch(() => null),
    getSession().catch(() => null),
  ]);

  if (clerkUser) {
    const primaryEmail =
      clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      null;

    const displayName =
      clerkUser.firstName || clerkUser.lastName
        ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim()
        : clerkUser.username || primaryEmail || "User";

    return {
      id: clerkUser.id,
      email: primaryEmail,
      githubUserId: session?.user?.id,
      githubUsername: session?.user?.login,
      avatarUrl: clerkUser.imageUrl || session?.user?.avatar_url,
      displayName: displayName || session?.user?.name || session?.user?.login,
    };
  }

  if (session?.user) {
    return {
      id: `user_gh_${session.user.id}`,
      email: null,
      githubUserId: session.user.id,
      githubUsername: session.user.login,
      avatarUrl: session.user.avatar_url,
      displayName: session.user.name || session.user.login,
    };
  }

  return null;
}

