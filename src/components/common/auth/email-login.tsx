import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authValidator } from "@/validators/auth";
import { useEmailLogin } from "@/backend-apis/auth/hooks";
import { useRouter } from "next/navigation";

const formSchema = authValidator.emailLogin;

const EmailLogin = ({ onBackClick }: { onBackClick: () => void }) => {
  const emailLogin = useEmailLogin();
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const res = await emailLogin.mutateAsync(data);

      if (res?.data?.bearerToken) {
        localStorage.setItem("nextpostai_token", res.data.bearerToken);
      }

      router.replace("/project");
    } catch {}
  };

  return (
    <>
      <DialogHeader>
        <Button
          size={"sm"}
          onClick={onBackClick}
          variant="ghost"
          className="self-start"
        >
          <ArrowLeft /> Back
        </Button>
        <DialogDescription className="text-center">
          Enter your email and password to continue.
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            loading={emailLogin.isPending}
            type="submit"
            className="w-full"
          >
            Login
          </Button>
        </form>
      </Form>
    </>
  );
};

export { EmailLogin };
