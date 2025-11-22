"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import api from "@/backend-apis/axios";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import Cookies from "js-cookie";
import { Copy, LogOut } from "lucide-react";

interface PartnerStats {
  partner: {
    id: string;
    name: string;
    email: string;
    code: string;
    referralLink: string;
  };
  stats: {
    totalClicks: number;
    totalSignups: number;
    conversionRate: number;
  };
  recentClicks: Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
  }>;
  signups: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      createdAt: string;
    } | null;
    createdAt: string;
  }>;
}

export default function ReferralPartnerPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginMode, setLoginMode] = useState(true);
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    // Check if already logged in
    const token = Cookies.get(AUTH_TOKEN_COOKIE_NAME);
    if (token) {
      loadStats();
    } else {
      setLoginMode(true);
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/referral/partner/login", loginData);
      if (response.data.status === 200) {
        Cookies.set(AUTH_TOKEN_COOKIE_NAME, response.data.data.bearerToken, {
          expires: 30,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        toast.success("Login successful!");
        setLoginMode(false);
        loadStats();
      } else {
        toast.error(response.data.message || "Login failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get("/referral/partner/stats");
      if (response.data.status === 200) {
        setStats(response.data.data);
      } else {
        toast.error("Failed to load statistics");
        if (response.data.status === 401) {
          setLoginMode(true);
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setLoginMode(true);
      } else {
        toast.error("Failed to load statistics");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove(AUTH_TOKEN_COOKIE_NAME);
    setLoginMode(true);
    setStats(null);
  };

  const copyReferralLink = () => {
    if (stats?.partner.referralLink) {
      navigator.clipboard.writeText(stats.partner.referralLink);
      toast.success("Referral link copied to clipboard!");
    }
  };

  if (loading && !loginMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (loginMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Referral Partner Login</CardTitle>
            <CardDescription>
              Enter your credentials to view your referral statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={loginData.username}
                  onChange={(e) =>
                    setLoginData({ ...loginData, username: e.target.value })
                  }
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
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

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Referral Dashboard</h1>
            <p className="text-slate-600 mt-1">Welcome, {stats?.partner.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.stats.totalClicks}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.stats.totalSignups}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.stats.conversionRate.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Referral Link */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Referral Link</CardTitle>
                <CardDescription>
                  Share this link to track referrals and signups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Input
                    value={stats.partner.referralLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={copyReferralLink} size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Signups Table */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Signups</CardTitle>
                <CardDescription>
                  Users who signed up through your referral link
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.signups.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Signup Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.signups.map((signup) => (
                        <TableRow key={signup.id}>
                          <TableCell>
                            {signup.user?.name || "Unknown"}
                          </TableCell>
                          <TableCell>{signup.user?.email || "N/A"}</TableCell>
                          <TableCell>
                            {new Date(signup.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No signups yet. Share your referral link to get started!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Clicks */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Clicks</CardTitle>
                <CardDescription>
                  Last 10 clicks on your referral link
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.recentClicks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentClicks.map((click) => (
                        <TableRow key={click.id}>
                          <TableCell>
                            {new Date(click.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>{click.ipAddress || "Unknown"}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {click.userAgent || "Unknown"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No clicks yet. Share your referral link to get started!
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
