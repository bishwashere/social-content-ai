import { Suspense } from "react";
import CreatePostClient from "./_components/create-post-client";
import { Loader2 } from "lucide-react";

export default function CreatePostPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <CreatePostClient />
    </Suspense>
  );
}
