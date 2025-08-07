"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Home } from 'lucide-react'
import Link from "next/link"
import { AUTH_ERROR } from "@/constants/auth-error"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function ErrorPage() {
  const searchParams = useSearchParams();
  let error = AUTH_ERROR[searchParams.get("code") as keyof typeof AUTH_ERROR]

  if (!error) {
    error = {
      title: "Unknown Error",
      description: "An unknown error occurred. Please try again later."
    }
  }


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">{error.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {error.description}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="w-full sm:w-auto ml-auto" asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}


export default function Page() {
  return (
    <Suspense>
      <ErrorPage />
    </Suspense>
  )
}
