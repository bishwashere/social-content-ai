"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, ArrowRight } from "lucide-react"
import confetti from "canvas-confetti"
import { useGetCheckoutSessionDetails } from "@/backend-apis/payment/hooks"
import { useRouter, useSearchParams } from "next/navigation"
import PaymentVerification from "./_components/payment-verification"
import PaymentErrorPage from "./_components/payment-error"
import { getInvoiceUrl } from "@/server-actions/get-invoice"
import { toast } from "sonner"
import { useSession } from "@/backend-apis/auth/hooks"

export default function PaymentSuccess() {
  useSession()
  const searchParams = useSearchParams()
  const [waitingFor, setWaitingFor] = useState(6 * 1000) // 6 seconds
  const session = useGetCheckoutSessionDetails(searchParams.get("session_id") as string)
  const router = useRouter()

  // Launch confetti effect when the component mounts
  useEffect(() => {

    if (session.isLoading || !session.isSuccess) return

    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: NodeJS.Timeout = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)

    return () => clearInterval(interval)
  }, [session.isLoading, session.isSuccess])

  useEffect(() => {
    const interval = setInterval(() => {
      setWaitingFor((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);


  if (session.isLoading) return <PaymentVerification />
  if (session.isError || !session.data) return <PaymentErrorPage tid={searchParams.get("session_id") || ""} />
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-green-100 p-3 rounded-full mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Payment Successful!</CardTitle>
          <CardDescription>Your premium plan subscription has been activated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">Basic</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                {session?.data?.data?.currency === "usd" ? "$" : session?.data?.data?.currency}
                {(session?.data?.data?.amount_total || 0)?.toString()}.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{
                new Date(session?.data?.data?.created * 1000).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })

              }</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Subscription ID</span>
              <span className="font-medium text-right">
                {session?.data?.data?.subscription as string}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Your premium benefits:</h3>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Unlimited projects</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Invite unlimited users to manage projects</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Invite unlimited users to view projects</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>100 completions per month</span>
              </li>
            </ul>
          </div>

          <div className="bg-primary/5 rounded-lg p-4">
            <p className="text-sm">
              Your 7-day free trial starts today. You won&apos;t be charged until the trial period ends.
            </p>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button variant="outline" className="w-full"
            onClick={async () => {
              try {
                console.log(session?.data?.data)
                const url = await getInvoiceUrl(session?.data?.data?.invoice as string)
                window.open(url, "_blank")
              } catch (error) {
                console.error(error)
                toast.error("Failed to download invoice")
              }
            }}
          >
            Download Invoice (PDF)
          </Button>
          <Button
            disabled={waitingFor > 0}
            className="w-full"
            onClick={() => router.push("/project")}
          >
            Get Started {waitingFor > 0 && `in ${Math.floor(waitingFor / 1000)}s`}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

