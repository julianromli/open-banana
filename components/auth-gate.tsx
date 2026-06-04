"use client"

import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

type AuthGateProps = {
  children: ReactNode
}

const CLERK_LOAD_TIMEOUT_MS = 15_000

/** Client-side auth gate — avoids server redirect issues on Cloudflare Workers. */
export function AuthGate({ children }: AuthGateProps) {
  const { isLoaded, userId } = useAuth()
  const router = useRouter()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (isLoaded) return
    const id = window.setTimeout(() => setTimedOut(true), CLERK_LOAD_TIMEOUT_MS)
    return () => window.clearTimeout(id)
  }, [isLoaded])

  useEffect(() => {
    if (isLoaded && !userId) {
      router.replace("/sign-in")
    }
  }, [isLoaded, userId, router])

  if (!isLoaded) {
    if (timedOut) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground max-w-md mx-auto">
          <p className="text-foreground font-medium">Authentication failed to load</p>
          <p className="text-sm">
            Clerk could not load (often DNS for <code className="text-xs">clerk.openbanana.fun</code> or
            missing allowed origins). Check Clerk Dashboard → Domains and Cloudflare DNS, then hard-refresh.
          </p>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  return <>{children}</>
}
