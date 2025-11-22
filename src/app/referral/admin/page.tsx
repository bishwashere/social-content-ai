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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import api from "@/backend-apis/axios";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import Cookies from "js-cookie";
import { Trash2, Plus } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  email: string;
  username: string;
  code: string;
  clicks: number;
  signups: number;
  createdAt: string;
}

interface Stats {
  totalPartners: number;
  totalClicks: number;
  totalSignups: number;
  conversionRate: number;
  partners: Partner[];
}

export default function ReferralAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get("/referral/admin/stats");
      if (response.data.status === 200) {
        setStats(response.data.data);
      } else {
        toast.error("Failed to load statistics");
        if (response.data.status === 401) {
          router.push("/referral");
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push("/referral");
      } else {
        toast.error("Failed to load statistics");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post("/referral/admin/partners", formData);
      if (response.data.status === 201) {
        toast.success("Partner created successfully!");
        setCreateDialogOpen(false);
        setFormData({ name: "", email: "", username: "", password: "" });
        loadStats();
      } else {
        toast.error(response.data.message || "Failed to create partner");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create partner");
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm("Are you sure you want to delete this partner?")) {
      return;
    }

    try {
      const response = await api.delete(`/referral/admin/partners/${id}`);
      if (response.data.status === 200) {
        toast.success("Partner deleted successfully!");
        loadStats();
      } else {
        toast.error(response.data.message || "Failed to delete partner");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete partner");
    }
  };

  const handleLogout = () => {
    Cookies.remove(AUTH_TOKEN_COOKIE_NAME);
    router.push("/referral");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // Use window.location.origin for localhost, otherwise use env or default
  const baseUrl = 
    typeof window !== "undefined" 
      ? window.location.origin 
      : (process.env.NEXT_PUBLIC_BASE_URL || "https://nextpostai.com");

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Referral System - Super Admin</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Overall Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalPartners}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalClicks}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Signups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSignups}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.conversionRate.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Partners Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Referral Partners</CardTitle>
                <CardDescription>
                  Manage referral partners and view their statistics
                </CardDescription>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Partner
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Referral Partner</DialogTitle>
                    <DialogDescription>
                      Add a new referral partner to the system
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePartner} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                        minLength={6}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Create Partner
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {stats && stats.partners.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Referral Link</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Signups</TableHead>
                    <TableHead>Conversion</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.partners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell>{partner.name}</TableCell>
                      <TableCell>{partner.email}</TableCell>
                      <TableCell>{partner.username}</TableCell>
                      <TableCell>
                        <a
                          href={`${baseUrl}/${partner.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          {baseUrl}/{partner.username}
                        </a>
                      </TableCell>
                      <TableCell>{partner.clicks}</TableCell>
                      <TableCell>{partner.signups}</TableCell>
                      <TableCell>
                        {partner.clicks > 0
                          ? ((partner.signups / partner.clicks) * 100).toFixed(2)
                          : 0}
                        %
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePartner(partner.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No partners yet. Create one to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
