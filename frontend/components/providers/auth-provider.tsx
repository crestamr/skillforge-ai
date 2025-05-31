"use client"

import * as React from "react"
import { SessionProvider } from "next-auth/react"
import { Session } from "next-auth"

interface AuthProviderProps {
  children: React.ReactNode
  session?: Session | null
}

export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider session={session} refetchInterval={5 * 60}>
      {children}
    </SessionProvider>
  )
}
