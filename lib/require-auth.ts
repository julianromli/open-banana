import { auth } from "@clerk/nextjs/server"

/** Server-side auth guard (Cloudflare Workers–safe; uses Clerk redirect, not next/navigation). */
export async function requireAuth(): Promise<void> {
  const { userId, redirectToSignIn } = await auth()
  if (!userId) {
    redirectToSignIn()
  }
}
