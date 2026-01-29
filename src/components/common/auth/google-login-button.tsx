"use client";
import { useContinueWithGoogle, useSession } from "@/backend-apis/auth/hooks";
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
import { MoveRight, Lock, Shield, Check } from "lucide-react";
import { EmailLogin } from "./email-login";
import Link from "next/link";

type Props = {
  triggerClassName?: string;
  trigger?: React.ReactNode;
  gotoDashboard?: React.ReactNode;
  buttonText?: string;
};

const GoogleLoginButton = ({
  triggerClassName,
  trigger,
  gotoDashboard,
  buttonText = "Start with 100 free credits",
}: Props) => {
  const [open, setOpen] = useState(false);
  const continueWithGoogle = useContinueWithGoogle();
  const router = useRouter();
  const { isLoading, isError } = useSession();
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

  const [tab, setTab] = useState<"google" | "email">("google");

  // Always show the trigger button, but conditionally show login dialog or dashboard button
  // This ensures the button is always visible, preventing hydration issues
  const isAuthenticated = !isLoading && !isError;
  
  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setTab("google");
        }
      }}
    >
      {isAuthenticated ? (
        gotoDashboard ?? (
          <Button
            className={triggerClassName}
            onClick={() => router.push("/project")}
          >
            {buttonText}
            <MoveRight className="scale-125" />
          </Button>
        )
      ) : (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className={triggerClassName}>
              {buttonText}
              <MoveRight className="scale-125" />
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogClose />

        {tab === "email" ? (
          <EmailLogin onBackClick={() => setTab("google")} />
        ) : (
          <>
            <DialogHeader>
              <DialogDescription className="text-center">
                Sign in to your account to continue
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center py-4 gap-2">
              <Button
                loading={continueWithGoogle.isPending}
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
              <Button
                loading={continueWithGoogle.isPending}
                variant="secondary"
                className="w-full max-w-sm flex items-center justify-center gap-2 py-6"
                onClick={() => setTab("email")}
              >
                Login with Email
              </Button>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Encrypted Connection</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Privacy Protected</span>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5" />
                  <span>No credit card required</span>
                </div>
              </div>

              <div className="mt-2 text-xs text-muted-foreground text-center">
                By continuing, you agree to our{" "}
                <Link href={"/privacy"} className="underline">
                  Terms of Service and Privacy Policy.
                </Link>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GoogleLoginButton;
