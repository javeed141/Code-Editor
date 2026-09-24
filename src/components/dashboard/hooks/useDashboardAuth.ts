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
    const homeUrl = new URL("/", window.location.origin).toString();

    // 1. Tell the server to expire the session cookie
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors — still continue cleanup
    }

    // 2. Clear in-memory React state
    setAuthenticatedUser(null);
    onLogoutCleanup?.();

    // 3. Nuke every client-readable cookie
    try {
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.split("=")[0].trim();
        document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
    } catch {
      // ignore
    }

    // 4. Clear ALL sessionStorage and localStorage (keep theme preference only)
    try {
      sessionStorage.clear();
      const currentTheme = localStorage.getItem("ai-code-editor-theme");
      localStorage.clear();
      if (currentTheme) {
        localStorage.setItem("ai-code-editor-theme", currentTheme);
      }
    } catch {
      // ignore storage errors
    }

    // 5. Hard redirect to home — full page reload so no stale JS state remains
    window.location.replace(homeUrl);
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
