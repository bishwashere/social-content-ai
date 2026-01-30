import React from "react";
import { Badge } from "../ui/badge";

type BadgeProps = {
  children: string;
};

const StatusBadge = ({ children }: BadgeProps) => {
  switch (children.toLowerCase()) {
    case "active":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          Active
        </Badge>
      );

    case "success":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          {status}
        </Badge>
      );
    case "trial":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
          Premium
        </Badge>
      );
    case "canceled":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
          Canceled
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{children}</Badge>;
  }
};

export default StatusBadge;
