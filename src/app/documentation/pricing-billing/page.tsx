"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Gift, CreditCard, Coins } from "lucide-react";

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
