"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function PaymentErrorPage({ tid }: { tid: string }) {
  // Mock transaction ID - in a real app, this would come from your payment processor

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Payment Verification Failed
          </CardTitle>
          <CardDescription className="text-center">
            We were unable to verify your payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="text-destructive">
              Your payment could not be verified. This could be due to
              insufficient funds, an expired card, or a temporary issue with our
              payment processor.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="transaction-id">Your Transaction ID</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="transaction-id"
                value={tid}
                readOnly
                className="font-mono"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(tid);
                  toast.success("Copied to clipboard");
                }}
                title="Copy to clipboard"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-copy"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Please save this ID for reference when contacting support.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center mb-2">
            If you think this is a mistake, please contact our support team with
            your transaction ID.
          </div>
          <div className="flex flex-col sm:flex-row w-full gap-2">
            <Button className="w-full" asChild>
              <Link href="/contact-support">
                Contact Support
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
