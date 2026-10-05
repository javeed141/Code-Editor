import { useCallback, useState } from "react";
import type { GitHubUser } from "@/src/types/github";

interface UseDashboardAuthProps {
  onLogoutCleanup?: () => void;
}

export function useDashboardAuth({ onLogoutCleanup }: UseDashboardAuthProps = {}) {
  const [authenticatedUser, setAuthenticatedUser] = useState<GitHubUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const handleGitHubSignIn = useCallback(() => {
    window.location.assign(new URL("/api/auth/github", window.location.origin));
  }, []);

  const handleLogout = useCallback(async () => {
    // 1. Tell the server to expire the GitHub session cookie
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Cache-Control": "no-cache" },
      });
    } catch {
      // ignore network errors — still continue cleanup
    }

    // 2. Clear in-memory React state for GitHub
    setAuthenticatedUser(null);
    onLogoutCleanup?.();

    // 3. Force a reload so Next.js server components re-render without the GitHub session
    window.location.reload();
  }, [onLogoutCleanup]);


  return {
    authenticatedUser,
    setAuthenticatedUser,
    authLoading,
    setAuthLoading,
    handleGitHubSignIn,
    handleLogout,
  };
}

