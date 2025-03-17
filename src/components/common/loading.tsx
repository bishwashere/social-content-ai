import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

const Loading = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
    >
      <Loader2 className="size-6 animate-spin duration-300" />
    </div>
  );
};

export default Loading;
