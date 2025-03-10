"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, ArrowLeft, ShieldAlert } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function PaymentFailed() {
  // Generate a reference ID for the failed transaction

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md border-red-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-red-100 p-3 rounded-full mb-4">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Payment Failed</CardTitle>
          <CardDescription>We couldn&apos;t process your payment for the premium plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="space-y-2">
            <h3 className="font-semibold flex items-center">
              <ShieldAlert className="h-4 w-4 mr-2 text-red-600" />
              Possible reasons for failure:
            </h3>
            <ul className="space-y-1.5 text-sm pl-6 list-disc">
              <li>Insufficient funds in your account</li>
              <li>Card expired or invalid card details</li>
              <li>Transaction declined by your bank</li>
              <li>Temporary issue with payment processor</li>
              <li>Billing address doesnapos;t match card information</li>
            </ul>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="troubleshooting">
              <AccordionTrigger className="text-sm font-medium">Troubleshooting steps</AccordionTrigger>
              <AccordionContent className="text-sm space-y-2">
                <p>Here are some steps you can take:</p>
                <ol className="space-y-1.5 pl-6 list-decimal">
                  <li>Verify your card has sufficient funds</li>
                  <li>Check that your card details are entered correctly</li>
                  <li>Try a different payment method</li>
                  <li>Contact your bank to authorize the transaction</li>
                  <li>Try again in a few minutes</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
        <Separator />
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button asChild variant="outline" className="w-full">
            <Link href="/project">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go back
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

