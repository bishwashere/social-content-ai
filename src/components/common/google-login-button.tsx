"use client";
import { useContinueWithGoogle } from "@/backend-apis/auth/hooks";
import React, { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { MoveRight } from "lucide-react";

type Props = {
  triggerClassName: string;
};

const GoogleLoginButton = ({ triggerClassName }: Props) => {
  const [open, setOpen] = useState(false);
  const continueWithGoogle = useContinueWithGoogle();
  const router = useRouter();
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await continueWithGoogle.mutateAsync({
          credential: tokenResponse.access_token,
        });

        if (res?.data?.bearerToken) {
          localStorage.setItem("nextpostai_token", res.data.bearerToken);
        }

        router.replace("/project");

      } catch {}
    },
    scope: "profile email",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={triggerClassName}
        >
          Get Started Now
          <MoveRight className="scale-125"/>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogClose />
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Welcome Back
          </DialogTitle>
          <DialogDescription className="text-center">
            Sign in to your account to continue
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center py-4">
          <Button
            loading={continueWithGoogle.isPending}
            variant="outline"
            className="w-full max-w-sm flex items-center justify-center gap-2 py-6"
            onClick={() => login()}
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt=""
              className="size-5"
            />
            Continue with Google
          </Button>

          <div className="mt-8 text-sm text-muted-foreground text-center">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleLoginButton;