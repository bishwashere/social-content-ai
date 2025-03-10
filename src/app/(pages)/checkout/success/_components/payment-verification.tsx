"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, CreditCard, ShieldCheck } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default function PaymentVerification() {
  const [progress, setProgress] = useState(0)

  // Simulate payment verification progress
  useEffect(() => {
    let interval: NodeJS.Timeout

    // Start the progress animation
    const startProgress = () => {
      let currentProgress = 0
      interval = setInterval(() => {
        // Increment progress with a slight randomization
        const increment = Math.random() * 15 + 5
        currentProgress = Math.min(currentProgress + increment, 100)
        setProgress(currentProgress)

        // Clear interval when done
        if (currentProgress >= 100) {
          clearInterval(interval)
          // Here you would typically redirect to success or failure page
          // For demo purposes, we'll just keep showing 100%

          // Redirect example (uncomment to use):
          // setTimeout(() => {
          //   window.location.href = '/payment/success'; // or '/payment/failed'
          // }, 1000);
        }
      }, 800)
    }

    // Start with a small delay to allow component to render
    const timer = setTimeout(startProgress, 300)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <svg
              className="h-16 w-16 text-primary/20"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="10" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verifying Your Payment</h1>
          <p className="text-muted-foreground">Please wait while we confirm your transaction</p>
        </div>

        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="space-y-6">
              <Progress value={progress} className="h-2" />

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium">Payment Information</p>
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium">Transaction Details</p>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          This usually takes less than a minute. Please don&apos;t close this page.
        </p>
      </div>
    </div>
  )
}

