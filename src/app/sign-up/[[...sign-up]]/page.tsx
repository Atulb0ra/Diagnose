'use client'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { SignUp, useUser } from '@clerk/nextjs'

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
      <SignUp routing="path" path="/sign-up"  />
    </div>
  )
}