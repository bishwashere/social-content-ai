"use client"
import Subscription from "./_components/subscription"


export default function BillingPage() {
  return (
    <div className="container py-6 space-y-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and view your billing history</p>
      </div>
      <Subscription />
    </div>
  )
}

