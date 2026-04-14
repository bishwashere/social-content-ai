"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Activity,
  Video,
  FileText,
  Share2,
  Users,
  UserCheck,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/cn";

const CATEGORIES = [
  {
    label: "User Activity",
    icon: Activity,
    links: [
      { label: "User Activity", href: "/user-activity", icon: Video },
      { label: "User Activity", href: "/user-activity/campaigns", icon: Users },
    ],
  },
  {
    label: "Admin",
    icon: FileText,
    links: [
      { label: "Ideas CMS", href: "/ideas/admin", icon: FileText },
      { label: "Referral Admin", href: "/referral/admin", icon: Share2 },
      { label: "Partner Portal", href: "/referral/partner", icon: UserCheck },
      { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
    ],
  },
];

interface AdminQuickLinksProps {
  isInternalAdmin?: boolean;
}

export function AdminQuickLinks({ isInternalAdmin }: AdminQuickLinksProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!isInternalAdmin) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm transition-all duration-200 shadow-sm hover:shadow",
          open
            ? "border-violet-400 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300"
            : "border-border bg-card/60 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"
        )}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Admin
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-card shadow-lg ring-1 ring-black/5 dark:ring-white/5 overflow-hidden">
          {CATEGORIES.map((cat, ci) => (
            <div key={cat.label}>
              {ci > 0 && <div className="border-t border-border" />}
              <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
                <cat.icon className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.label}
                </span>
              </div>
              <div className="pb-1.5">
                {cat.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 mx-1 rounded-lg text-sm text-foreground/80 hover:text-foreground hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                  >
                    <link.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
