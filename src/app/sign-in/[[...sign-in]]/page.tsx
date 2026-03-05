'use client'
import { SignIn, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Page() {
  const { isSignedIn } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isSignedIn) {
      router.replace("/dashboard")
    }
  }, [isSignedIn, router])
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn routing="path" path="/sign-in" />
    </div>
  )
}