"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Gift, CreditCard, Coins, CheckCircle } from "lucide-react";

export default function PricingBillingPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-6 w-6 text-green-600" />
          <h1 className="text-4xl font-bold">Pricing & Billing</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Subscription plans, free credits, and billing management
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-green-600" />
              Welcome Offer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              New users see a welcome offer when they first land on the dashboard:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>A popup highlights your free credits and how to get started</li>
              <li>Countdown timer shows how long the offer or trial terms are available</li>
              <li>Designed to make the first steps clear and encourage exploration</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Credit Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Before credits are spent on certain actions, you’re asked to confirm:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Ad generation and ad discovery flows show a confirmation dialog before deducting credits</li>
              <li>You can cancel or confirm so there are no surprise deductions</li>
              <li>Helps you stay in control of credit usage</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Premium Plan includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Unlimited projects</li>
              <li>Unlimited user management</li>
              <li>Unlimited viewers</li>
              <li>Unlimited content generation</li>
              <li>All premium features</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Free Credits to Start</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              New users get 100 free credits to explore the platform:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Full access to all features</li>
              <li>No credit card required to start</li>
              <li>Subscribe anytime for more credits</li>
              <li>100 credits refresh monthly with subscription</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credits System</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Usage-based credits for content generation:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Credits deducted per content generation</li>
              <li>Platform-specific credit costs</li>
              <li>Track remaining credits in dashboard</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Manage your subscription:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Update payment method</li>
              <li>View invoices</li>
              <li>Cancel subscription</li>
              <li>Subscribe or upgrade plan</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
