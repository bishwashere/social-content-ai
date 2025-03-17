import {
  useGetSubscription,
  useManageSubscription,
} from "@/backend-apis/payment/hooks";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatusBadge from "@/components/common/status-badge";
import { formatDate } from "@/lib/format-date";
import { Calendar1Icon, CreditCardIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

import Loading from "@/components/common/loading";
import { Badge } from "@/components/ui/badge";
import { isSubscriptionExpired } from "@/lib/sub";

const Subscription = () => {
  const { data: activeSubscription, isLoading } = useGetSubscription();
  const [clickedButton, setClickedButton] = useState<
    "manage-subscription" | "cancel-subscription"
  >();

  const mangeSubs = useManageSubscription();

  if (isLoading) return <Loading className="h-[70vh]" />;

  if (!activeSubscription) return null;

  const status = isSubscriptionExpired(activeSubscription.endsAt);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Current Subscription</CardTitle>
          <div className="flex gap-4 items-center">
            <StatusBadge>{activeSubscription?.status}</StatusBadge>
            <Badge variant={status.expiringSoon ? "destructive" : "default"}>
              {status.isExpired
                ? "Expired"
                : status.expiringSoon
                  ? `Expiring in ${status.remainingDays} days`
                  : "Active"}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Your subscription details and management options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Plan</p>
            <p className="font-medium">Premium</p>
          </div>
          <div className="space-y-1"></div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Last Billing Started on
            </p>
            <p className="font-medium">
              {formatDate(new Date(activeSubscription?.startedAt))}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {activeSubscription?.status === "trialing"
                ? "Trial ends on"
                : "Next billing date"}
            </p>
            <p className="font-medium">
              {formatDate(new Date(activeSubscription?.endsAt))}
            </p>
          </div>
        </div>

        <div className="rounded-md bg-muted p-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Premium Features</p>
              <p className="text-sm text-muted-foreground">
                Unlimited projects, users, and unlimited completions.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          loading={
            mangeSubs.isPending && clickedButton === "manage-subscription"
          }
          onClick={() => {
            setClickedButton("manage-subscription");
            mangeSubs.mutate();
          }}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <CreditCardIcon className="mr-2 h-4 w-4" />
          Update Payment Method
        </Button>

        <Button
          loading={
            mangeSubs.isPending && clickedButton === "cancel-subscription"
          }
          onClick={() => {
            setClickedButton("cancel-subscription");
            mangeSubs.mutate();
          }}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <Calendar1Icon className="mr-2 h-4 w-4" />
          Manage Subscription
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Subscription;
