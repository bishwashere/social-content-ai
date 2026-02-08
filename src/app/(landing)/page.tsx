"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import "./landing.css";

const GoogleLoginButton = dynamic(
  () => import("@/components/common/auth/google-login-button"),
  { ssr: false }
);

const NewsletterPopup = dynamic(
  () => import("@/components/common/newsletter-popup").then((m) => ({ default: m.NewsletterPopup })),
  { ssr: false }
);

const WelcomeOfferPopup = dynamic(
  () => import("@/components/common/welcome-offer-popup").then((m) => ({ default: m.WelcomeOfferPopup })),
  { ssr: false }
);

const CtaTimer = dynamic(
  () => import("@/components/common/cta-timer").then((m) => ({ default: m.CtaTimer })),
  { ssr: false }
);

import { CircularFlowDiagram } from "@/components/circular-flow-diagram";

import {
  Sparkles,
  Zap,
  Calendar,
  Target,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  MessageSquare,
  Shield,
  ArrowRight,
  Bot,
  Brain,
  Lightbulb,
  Menu,
  Crown,
} from "lucide-react";

// Section titles for dynamic browser tab
const SECTION_TITLES: Record<string, string> = {
  hero: "Save 10+ Hours a Week on Marketing | NextPostAI",
  "how-it-works": "How It Works | NextPostAI",
  comparison: "Stop Wasting Hours. Get This Instead | NextPostAI",
  features: "Why Choose NextPostAI?",
  // testimonials: "Testimonials | NextPostAI",
  trust: "Mobile-Friendly Design | NextPostAI",
  pricing: "Pricing | NextPostAI",
  cta: "Ready to Save 10+ Hours & Launch Smarter? | NextPostAI",
};

// Navigation menu items
const NAV_ITEMS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Why NextPostAI", href: "#features" },
  // { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

interface UserAvatar {
  avatarUrl: string;
  name: string;
}

interface LandingStats {
  totalContentCreated: number;
  totalCampaigns: number;
  totalUsers: number;
  userAvatars: UserAvatar[];
}

export default function ModernLanding() {
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
  const [avatarCount, setAvatarCount] = useState(15);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly");
  const [showOfferPopup, setShowOfferPopup] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Handle smooth scroll to section and close menu
  const scrollToSection = (href: string) => {
    setIsMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Handle responsive avatar count
  useEffect(() => {
    const updateAvatarCount = () => {
      if (window.innerWidth < 640) {
        setAvatarCount(11);
      } else if (window.innerWidth < 768) {
        setAvatarCount(13);
      } else {
        setAvatarCount(15);
      }
    };

    updateAvatarCount();
    window.addEventListener('resize', updateAvatarCount);
    return () => window.removeEventListener('resize', updateAvatarCount);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/landing/stats");
        if (response.ok) {
          const data = await response.json();
          if (data.data) setStats(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // Intersection Observer for dynamic browser tab title
  useEffect(() => {
    const titleObserver = new IntersectionObserver(
      (entries) => {
        // Find the most visible section
        let maxRatio = 0;
        let visibleSectionId = "hero";

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            visibleSectionId = entry.target.id || "hero";
          }
        });

        // Update document title
        if (maxRatio > 0 && SECTION_TITLES[visibleSectionId]) {
          document.title = SECTION_TITLES[visibleSectionId];
        }
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: "-10% 0px -10% 0px",
      }
    );

    // Observe all sections including hero
    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) titleObserver.observe(ref);
    });

    return () => titleObserver.disconnect();
  }, []);

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Strategy",
      description: "Get a complete marketing roadmap tailored to your product launch timeline.",
    },
    {
      icon: Zap,
      title: "Instant Content",
      description: "Generate 30 days of posts in minutes, customized to your brand voice.",
    },
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Never miss a post with intelligent scheduling and timely reminders.",
    },
    {
      icon: Target,
      title: "Multi-Platform",
      description: "Create content for X, LinkedIn, Instagram, Facebook, and more.",
    },
  ];

  // const testimonials = [
  //   {
  //     name: "Alex R",
  //     role: "Digital Marketer",
  //     image: "/tmpdj5rdrob.webp",
  //     quote: "NextPostAI transformed how I market my product. It's like having a mini CMO in my pocket!",
  //   },
  //   {
  //     name: "Jamie L",
  //     role: "Small Business Owner",
  //     image: "/tmp6gymd1vw.webp",
  //     quote: "I stopped overthinking and just followed the AI's plan. It works.",
  //   },
  //   {
  //     name: "Morgan K",
  //     role: "Content Creator",
  //     image: "/tmph6iuxe9k.webp",
  //     quote: "The campaign timelines helped me organize my entire product launch.",
  //   },
  // ];

  return (
    <>
      <WelcomeOfferPopup externalOpen={showOfferPopup} onExternalOpenChange={setShowOfferPopup} />
      <NewsletterPopup />
      <Script
        src="https://link.msgsndr.com/js/am.js"
        strategy="afterInteractive"
        onLoad={() => {
          try {
            window.affiliateManager?.init(
              "eUSmMicux5YGnmRl6263",
              "https://backend.leadconnectorhq.com",
              ".www.nextpostai.com"
            );
          } catch {}
        }}
      />

      <div className="landing-page min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
        {/* Hamburger Menu Button - Fixed Position */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="fixed top-6 right-6 z-50 w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Toggle menu"
          style={{ 
            position: 'fixed', 
            top: '1.5rem', 
            right: '1.5rem',
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          <Menu className="w-6 h-6 text-white pointer-events-none" />
        </button>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" 
            onClick={() => setIsMenuOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div 
              className="absolute top-0 right-0 w-80 max-w-[85vw] h-full bg-[#0a0a0f]/95 border-l border-white/10 p-8 pt-24"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="space-y-2">
                {NAV_ITEMS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => scrollToSection(item.href)}
                    className="w-full text-left px-4 py-3 rounded-xl text-lg font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-3"
                  >
                    <ArrowRight className="w-4 h-4 text-purple-400" />
                    {item.label}
                  </button>
                ))}
              </nav>
              <div className="mt-8 pt-8 border-t border-white/10">
                <GoogleLoginButton 
                  triggerClassName="w-full glow-button px-6 py-3 text-base font-semibold rounded-xl text-white flex items-center justify-center gap-2"
                  buttonText="Get Started Free"
                />
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section
          id="hero"
          ref={(el) => { sectionRefs.current["hero"] = el }}
          className="relative min-h-screen flex items-center justify-center hero-gradient"
        >
          {/* Floating orbs */}
          <div className="floating-orb orb-1" />
          <div className="floating-orb orb-2" />
          <div className="floating-orb orb-3" />
          
          {/* Grid pattern */}
          <div className="grid-pattern" />
          
          {/* Neural pattern */}
          <div className="neural-pattern" />

          {/* Floating Social Media Icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* LinkedIn */}
            <div className="absolute top-[10%] left-[3%] w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-[#0077B5]/20 border border-[#0077B5]/30 flex items-center justify-center animate-float-slow">
              <svg className="w-7 h-7 md:w-10 md:h-10 text-[#0077B5]/60" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </div>
            {/* X/Twitter */}
            <div className="absolute top-[12%] right-[5%] w-14 h-14 md:w-18 md:h-18 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center animate-float-medium">
              <svg className="w-7 h-7 md:w-9 md:h-9 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </div>
            {/* Instagram */}
            <div className="absolute top-[38%] left-[2%] w-14 h-14 md:w-18 md:h-18 rounded-2xl bg-gradient-to-br from-[#833AB4]/20 via-[#FD1D1D]/20 to-[#F77737]/20 border border-[#E1306C]/30 flex items-center justify-center animate-float-fast">
              <svg className="w-7 h-7 md:w-9 md:h-9 text-[#E1306C]/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </div>
            {/* Facebook */}
            <div className="absolute top-[60%] right-[3%] w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#1877F2]/20 border border-[#1877F2]/30 flex items-center justify-center animate-float-slow">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-[#1877F2]/60" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </div>
            {/* Reddit */}
            <div className="absolute top-[75%] left-[5%] w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#FF4500]/20 border border-[#FF4500]/30 flex items-center justify-center animate-float-medium">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-[#FF4500]/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
            </div>
            {/* Threads */}
            <div className="absolute top-[82%] right-[12%] w-14 h-14 md:w-18 md:h-18 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center animate-float-fast">
              <svg className="w-7 h-7 md:w-9 md:h-9 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.332-3.023.842-.699 2.005-1.115 3.376-1.21 1.196-.082 2.262.058 3.204.376-.084-.79-.291-1.398-.607-1.828-.483-.658-1.238-.998-2.243-1.015-1.593.02-2.503.678-2.897 1.057l-1.37-1.63c.726-.677 2.14-1.54 4.33-1.546h.013c1.626.022 2.907.573 3.808 1.64.712.845 1.122 1.937 1.23 3.267.678.278 1.272.64 1.769 1.078l.004.003c1.043.918 1.683 2.128 1.868 3.529.254 1.92-.259 3.926-1.449 5.665-1.407 2.055-3.673 3.322-6.545 3.665-.488.058-.98.087-1.472.087z"/></svg>
            </div>
            {/* TikTok */}
            <div className="absolute top-[32%] right-[2%] w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center animate-float-medium">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-white/50" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
            </div>
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32">
            <div className="text-center space-y-4">
              {/* Main heading */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white">
                NextPostAI<span className="text-xl md:text-2xl lg:text-3xl font-normal align-baseline opacity-80">.com</span>
              </h1>

              {/* Tagline */}
              <p className="text-2xl md:text-4xl lg:text-5xl font-semibold text-purple-400">
                Save 10+ Hours a Week on Marketing
              </p>

              {/* Subheading */}
              <p className="text-lg md:text-xl lg:text-2xl font-normal text-gray-300 max-w-3xl mx-auto leading-relaxed opacity-90 px-4">
                Create, publish, analyze, and improve → automatically.
              </p>

              {/* CTA Button */}
              <div className="flex flex-col items-center justify-center gap-11 pt-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <GoogleLoginButton 
                      triggerClassName="glow-button px-8 py-4 text-lg font-semibold rounded-xl text-white flex items-center gap-2"
                      buttonText="Start Free with 100 Posts"
                    />
                    <CtaTimer onClick={() => setShowOfferPopup(true)} />
                  </div>
                  
                  {/* Trust Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Shield className="w-4 h-4 text-green-400" />
                      <span>Encrypted Connection</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Shield className="w-4 h-4 text-green-400" />
                      <span>Privacy Protected</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Check className="w-4 h-4 text-green-400" />
                      <span>No credit card required</span>
                    </div>
                  </div>
                </div>
                
                {/* Avatars Section */}
                <div className="flex flex-col items-center gap-4 opacity-90">
                  <div className="flex -space-x-2 justify-center max-w-2xl px-4">
                    {(stats?.userAvatars?.slice(0, avatarCount) || []).map((user, idx) => (
                      <div
                        key={idx}
                        className="relative"
                        title={user.name}
                        style={{ zIndex: 10 }}
                      >
                        <Image
                          src={user.avatarUrl}
                          alt={user.name}
                          width={36}
                          height={36}
                          className="w-9 h-9 min-w-[2.25rem] min-h-[2.25rem] rounded-full border-2 border-[#0a0a0f] object-cover hover:scale-110 transition-transform saturate-90"
                        />
                      </div>
                    ))}
                    {((stats?.totalUsers || 147) - (stats?.userAvatars?.slice(0, avatarCount)?.length || avatarCount)) > 0 && (
                      <div 
                        className="relative w-9 h-9 min-w-[2.25rem] min-h-[2.25rem] rounded-full border-2 border-[#0a0a0f] bg-purple-600 flex items-center justify-center text-sm font-semibold text-white"
                        style={{ zIndex: 20 }}
                      >
                        +{(stats?.totalUsers || 147) - (stats?.userAvatars?.slice(0, avatarCount)?.length || avatarCount)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm md:text-base font-medium text-gray-300 px-4">
                    <span className="text-white font-semibold">{stats?.totalUsers || 147}+</span> indie builders using NextPostAI<span className="text-xs opacity-90">.com</span>
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-6 h-6 text-gray-400" />
          </div>
        </section>

        {/* How It Works Section - Carousel */}
        <section
          id="how-it-works"
          ref={(el) => { sectionRefs.current["how-it-works"] = el }}
          className="relative py-24 lg:py-32"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />
          
          <div className={`relative z-10 max-w-7xl mx-auto px-6 reveal ${isVisible["how-it-works"] ? "visible" : ""}`}>
            {/* Section header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-cyan-500/30 mb-6">
                <Lightbulb className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-200">Simple Process</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                <span className="text-white">How It </span>
                <span className="gradient-text-accent">Works</span>
              </h2>
            </div>

            {/* Circular flow diagram */}
            <div className="max-w-6xl mx-auto">
              <CircularFlowDiagram />
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <div className="inline-flex items-center gap-3">
                <GoogleLoginButton 
                  triggerClassName="glow-button px-8 py-4 text-lg font-semibold rounded-xl text-white"
                  buttonText="Start Free with 100 Posts"
                />
                <CtaTimer onClick={() => setShowOfferPopup(true)} />
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="section-divider" />

        {/* Comparison Section */}
        <section
          id="comparison"
          ref={(el) => { sectionRefs.current["comparison"] = el }}
          className="relative py-24 lg:py-32"
        >
          <div className={`max-w-7xl mx-auto px-6 reveal ${isVisible["comparison"] ? "visible" : ""}`}>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                <span className="text-white">Stop Wasting Hours. </span>
                <span className="gradient-text-accent">Get This Instead</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Traditional Approach */}
              <div className="comparison-card negative glass-card rounded-3xl p-8">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  Traditional Approach
                </h3>
                <ul className="space-y-4">
                  {[
                    "Spend 5–15 hours/week analyzing trends & brainstorming",
                    "Post inconsistently and lose momentum",
                    "Write everything manually (takes forever)",
                    "No real long-term plan – just random posts",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-300">
                      <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* With NextPostAI */}
              <div className="comparison-card positive glass-card rounded-3xl p-8 animated-border">
                <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  With NextPostAI<span className="text-sm font-normal opacity-90">.com</span>
                </h3>
                <ul className="space-y-4">
                  {[
                    "Save 10+ hours/week – AI handles strategy & planning",
                    "Never miss a post – Smart calendar + timely reminders",
                    "30 days of content in minutes – Instant generation",
                    "Stay consistent & grow – Full promo journey",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-200 font-medium">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-8">
              Typical time savings reported by indie tools & builders.
            </p>
          </div>
        </section>

        {/* Divider - commented out with testimonials */}
        {/* <div className="section-divider" /> */}

        {/* Testimonials Section - commented out
        <section
          id="testimonials"
          ref={(el) => { sectionRefs.current["testimonials"] = el }}
          className="relative py-24 lg:py-32"
        >
          <div className="absolute inset-0 cta-gradient" />
          
          <div className={`relative z-10 max-w-7xl mx-auto px-6 reveal ${isVisible["testimonials"] ? "visible" : ""}`}>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-yellow-500/30 mb-6">
                <MessageSquare className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-200">What People Say</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                <span className="gradient-text-accent">Testimonials</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, idx) => (
                <div key={idx} className="testimonial-card rounded-3xl p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <Image
                      src={testimonial.image}
                      width={50}
                      height={50}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-sm text-gray-400">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Sparkles key={i} className="w-5 h-5 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-16">
              <p className="text-gray-400 text-lg mb-6">Ready to get started?</p>
              <GoogleLoginButton 
                triggerClassName="glow-button px-8 py-4 text-lg font-semibold rounded-xl text-white"
                buttonText="Start Free with 100 Posts"
              />
            </div>
          </div>
        </section>
        */}

        {/* Privacy Section */}
        <section
          id="trust"
          ref={(el) => { sectionRefs.current["trust"] = el }}
          className="relative py-12 lg:py-16"
        >
          <div className={`max-w-4xl mx-auto px-6 reveal ${isVisible["trust"] ? "visible" : ""}`}>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              {/* Privacy */}
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                <Shield className="w-12 h-12 text-green-400" />
              </div>
              <div>
                <h3 className="text-3xl font-bold gradient-text-accent mb-3">
                  Privacy <span className="text-white">& Security</span>
                </h3>
                <ul className="text-gray-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" /> 100% free to start
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" /> Upgrade later for pro features
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" /> 30-second signup
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section
          id="pricing"
          ref={(el) => { sectionRefs.current["pricing"] = el }}
          className="relative py-24 lg:py-32"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />
          
          <div className={`relative z-10 max-w-5xl mx-auto px-6 reveal ${isVisible["pricing"] ? "visible" : ""}`}>
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-green-500/30 mb-6">
                <Crown className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-200">Simple Pricing</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                <span className="text-white">Choose Your </span>
                <span className="gradient-text-accent">Plan</span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
                Start free, upgrade when you&apos;re ready
              </p>
              
              {/* Billing Toggle with Save Badge */}
              <div className="relative inline-block">
                {/* Save 20% Alert Badge - Top right, half outside/inside */}
                <div className="absolute -top-3 -right-12 z-10">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2 py-1.5 rounded-full shadow-lg border-2 border-white/20 flex items-center gap-0.5 whitespace-nowrap">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Save 20%
                  </div>
                </div>
                
                <div className="inline-flex items-center rounded-full bg-white/10 p-1 border border-white/20 mt-2">
                  <button
                    onClick={() => setBillingPeriod("monthly")}
                    className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                      billingPeriod === "monthly"
                        ? "bg-white text-gray-900 shadow-lg"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod("yearly")}
                    className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                      billingPeriod === "yearly"
                        ? "bg-white text-gray-900 shadow-lg"
                        : "text-gray-300 hover:text-white"
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <div className="glass-card rounded-3xl p-8 border border-white/10 hover:border-purple-500/30 transition-colors">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">$0</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-purple-400 font-medium mt-3">100 Posts (One-Time)</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    "100 posts to get started",
                    "AI-powered content generation",
                    "Multi-platform support",
                    "Basic campaign planning",
                    "Content scheduling",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-gray-300">
                      <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-3">
                  <GoogleLoginButton 
                    triggerClassName="w-full py-4 text-lg font-semibold rounded-xl text-white bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
                    buttonText="Get Started Free"
                  />
                  <CtaTimer onClick={() => setShowOfferPopup(true)} />
                </div>
              </div>

              {/* Premium Plan */}
              <div className="glass-card rounded-3xl p-8 border-2 border-purple-500/50 animated-border relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-purple-500 text-white text-sm font-semibold px-4 py-1 rounded-bl-xl">
                  {billingPeriod === "yearly" ? "BEST VALUE" : "POPULAR"}
                </div>
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
                  {billingPeriod === "monthly" ? (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold gradient-text-accent">$49.99</span>
                      <span className="text-gray-400">/month</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-5xl font-bold gradient-text-accent">$39.99</span>
                        <span className="text-gray-400">/month</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-2">
                        $479.88/year <span className="line-through text-gray-500">$599.88</span>
                      </p>
                    </>
                  )}
                  <p className="text-purple-400 font-medium mt-3">100 Posts / Month</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    "100 posts every month",
                    "Posts refresh monthly",
                    "100 free posts to start",
                    "Advanced campaign strategies",
                    "Priority content generation",
                    "Premium templates",
                  ].map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-gray-200 font-medium">
                      <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-3">
                  <GoogleLoginButton 
                    triggerClassName="w-full glow-button py-4 text-lg font-semibold rounded-xl text-white"
                    buttonText={billingPeriod === "yearly" ? "Start Premium (Save 20%)" : "Start Premium"}
                    showPricingAfterLogin={true}
                    billingPeriod={billingPeriod}
                  />
                  <CtaTimer onClick={() => setShowOfferPopup(true)} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="section-divider" />

        {/* Final CTA Section */}
        <section
          id="cta"
          ref={(el) => { sectionRefs.current["cta"] = el }}
          className="relative py-24 lg:py-32"
        >
          <div className="absolute inset-0 cta-gradient" />
          
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="text-white">Ready to Save 10+ Hours </span>
              <br />
              <span className="gradient-text-accent">& Launch Smarter?</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10 max-w-2xl mx-auto">
              Join 146+ creators using AI to plan, post, and grow - free to start.
            </p>
            <div className="inline-flex items-center gap-3">
              <GoogleLoginButton 
                triggerClassName="glow-button px-10 py-5 text-xl font-bold rounded-2xl text-white inline-flex items-center gap-3"
                buttonText="Start Free with 100 Posts"
              />
              <CtaTimer onClick={() => setShowOfferPopup(true)} />
            </div>
            <p className="text-gray-400 text-sm mt-6">
              No card required. Upgrade anytime.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <Link href="/ideas" className="hover:text-white transition-colors">Ideas</Link>
                <Link href="/documentation" className="hover:text-white transition-colors">Documentation</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
              </div>
              <p className="text-sm text-gray-500">
                Copyright © 2026. All rights reserved. NextPostAI<span className="text-xs opacity-90">.com</span>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
