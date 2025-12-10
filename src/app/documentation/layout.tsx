"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ChevronRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentationHeader } from "./_components/documentation-header";
import Footer from "@/components/footer";

const documentationLinks = [
  {
    title: "Features",
    href: "/documentation/features",
    children: [
      { title: "Quick Generate", href: "/documentation/features/quick-generate" },
      { title: "Campaign Planner", href: "/documentation/features/campaign-planner" },
      { title: "Blog News", href: "/documentation/features/blog-news" },
      { title: "Webhooks", href: "/documentation/features/webhooks" },
      { title: "Scheduled Posts", href: "/documentation/features/scheduled-posts" },
      { title: "Advanced Customization", href: "/documentation/features/advanced-customization" },
      { title: "Achievement Levels", href: "/documentation/features/achievement-levels" },
    ],
  },
  {
    title: "Platforms",
    href: "/documentation/platforms",
    children: [
      { title: "Facebook", href: "/documentation/platforms/facebook" },
      { title: "Instagram", href: "/documentation/platforms/instagram" },
      { title: "LinkedIn", href: "/documentation/platforms/linkedin" },
      { title: "Twitter / X", href: "/documentation/platforms/twitter" },
      { title: "TikTok", href: "/documentation/platforms/tiktok" },
      { title: "Threads", href: "/documentation/platforms/threads" },
      { title: "Reddit", href: "/documentation/platforms/reddit" },
    ],
  },
  {
    title: "Security Overview",
    href: "/documentation/security",
  },
];

export default function DocumentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    platforms: true,
    features: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DocumentationHeader />
      
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-20 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex w-full">
        {/* Sidebar Navigation */}
        <aside
          className={cn(
            "fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-muted/50 border-r overflow-y-auto z-40 transition-transform duration-300 flex-shrink-0 lg:flex",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="p-4">
            <nav className="space-y-1">
              {documentationLinks.map((link) => (
                <div key={link.href}>
                  <div className="flex items-center">
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex-1 text-sm py-2 px-3 rounded-md hover:bg-muted transition-colors",
                        isActive(link.href) && "bg-muted font-medium"
                      )}
                    >
                      {link.title}
                    </Link>
                    {link.children && (
                      <button
                        onClick={() => toggleSection(link.title.toLowerCase())}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            expandedSections[link.title.toLowerCase()] && "rotate-90"
                          )}
                        />
                      </button>
                    )}
                  </div>
                  {link.children && expandedSections[link.title.toLowerCase()] && (
                    <div className="ml-4 mt-1 space-y-1">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "block text-sm py-1.5 px-3 rounded-md hover:bg-muted transition-colors",
                            isActive(child.href) && "bg-muted font-medium"
                          )}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen w-full overflow-x-hidden">
          <div className="w-full px-6 py-8 lg:px-12">
            {children}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

