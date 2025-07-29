import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";

const messages = [
  "Generating your perfect campaign…",
  "Crafting engaging content for your audience…",
  "Almost there, just putting on the finishing touches!",
];

type LoadingCardProps = {
  loading: string;
};

const LoadingCard: React.FC<LoadingCardProps> = ({ loading }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [loading]);

  if (!loading) return null;

  return (
    <div className="w-full flex items-center justify-center pb-2 pt-4 gap-4 flex-row">
      <p className="text-lg font-medium">{messages[index]}</p>
      <Loader2 className="animate-spin h-5 w-5" />
    </div>
  );
};

export default LoadingCard;
