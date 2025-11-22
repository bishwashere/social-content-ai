"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Cookies from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import { toast } from "sonner";
import api from "@/backend-apis/axios";

export default function ReferralLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/referral/admin/login", {
        username,
        password,
      });

      console.log("Login response:", response.data);

      if (response.data.status === 200) {
        Cookies.set(AUTH_TOKEN_COOKIE_NAME, response.data.data.bearerToken, {
          expires: 30,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });

        toast.success("Login successful!");
        router.push("/referral/admin");
      } else {
        toast.error(response.data.message || "Login failed");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Super Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the referral system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
