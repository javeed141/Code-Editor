import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getSession } from "@/src/lib/session";
import { upsertUser } from "@/src/lib/supabase/db";

export async function GET() {
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

    try {
      await upsertUser({
        id: clerkUser.id,
        email: primaryEmail,
        display_name: displayName,
        avatar_url: clerkUser.imageUrl || null,
        github_user_id: session?.user?.id ?? null,
        github_username: session?.user?.login ?? null,
      });
    } catch (err) {
      console.error("Failed to sync user to Supabase:", err);
    }
  }

  if (!session) {
    return NextResponse.json({
      user: null,
      clerkUser: clerkUser ? { id: clerkUser.id, email: clerkUser.emailAddresses?.[0]?.emailAddress } : null,
    });
  }

  return NextResponse.json({
    user: session.user,
    clerkUser: clerkUser ? { id: clerkUser.id, email: clerkUser.emailAddresses?.[0]?.emailAddress } : null,
  });
}

