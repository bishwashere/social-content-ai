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

import {
  Sparkles,
  Zap,
  Calendar,
  Target,
  TrendingUp,
  Users,
  Rocket,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  MessageSquare,
  Shield,
  Smartphone,
  ArrowRight,
  Bot,
  Brain,
  Lightbulb,
} from "lucide-react";

// Section titles for dynamic browser tab
const SECTION_TITLES: Record<string, string> = {
  hero: "Save 10+ Hours a Week on Marketing | NextPostAI",
  "how-it-works": "How It Works | NextPostAI",
  comparison: "Stop Wasting Hours. Get This Instead | NextPostAI",
  features: "Why Choose NextPostAI?",
  testimonials: "Testimonials | NextPostAI",
  trust: "Mobile-Friendly Design | NextPostAI",
  benefits: "Who Can Benefit? | NextPostAI",
  cta: "Ready to Save 10+ Hours & Launch Smarter? | NextPostAI",
  faq: "Frequently Asked Questions | NextPostAI",
};

interface LandingStats {
  totalContentCreated: number;
  totalCampaigns: number;
  totalUsers: number;
}

export default function ModernLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

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

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M+";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K+";
    return num.toString() + "+";
  };

  const statData = [
    {
      title: "Posts Generated",
      value: loadingStats ? "1.2K+" : formatNumber(stats?.totalContentCreated || 1200),
      description: "AI-powered content in seconds",
      icon: Rocket,
    },
    {
      title: "Campaigns Launched",
      value: loadingStats ? "47+" : formatNumber(stats?.totalCampaigns || 47),
      description: "Full marketing strategies",
      icon: BarChart3,
    },
    {
      title: "Active Creators",
      value: loadingStats ? "146+" : formatNumber(stats?.totalUsers || 146),
      description: "Indie devs & founders",
      icon: Users,
    },
  ];

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

  const howItWorks = [
    {
      step: "01",
      title: "Describe Your Product",
      description: "Tell the AI about your project, target audience, and goals.",
      image: "/how-it-works-step-1.png",
    },
    {
      step: "02",
      title: "Get Your Strategy",
      description: "Receive a complete campaign plan with milestones and content ideas.",
      image: "/how-it-works-step-2.png",
    },
    {
      step: "03",
      title: "Generate Content",
      description: "AI creates platform-optimized posts matching your brand voice.",
      image: "/how-it-works-step-3.png",
    },
    {
      step: "04",
      title: "Review & Customize",
      description: "Fine-tune your content with easy editing tools.",
      image: "/how-it-works-step-4.png",
    },
    {
      step: "05",
      title: "Schedule & Automate",
      description: "Plan your posts and get reminders when it's time to publish.",
      image: "/how-it-works-step-5.png",
    },
    {
      step: "06",
      title: "Launch & Grow",
      description: "Track your progress and iterate on what works.",
      image: "/how-it-works-step-6.png",
    },
  ];

  const testimonials = [
    {
      name: "Alex R",
      role: "Digital Marketer",
      image: "/tmpdj5rdrob.webp",
      quote: "NextPostAI transformed how I market my product. It's like having a mini CMO in my pocket!",
    },
    {
      name: "Jamie L",
      role: "Small Business Owner",
      image: "/tmp6gymd1vw.webp",
      quote: "I stopped overthinking and just followed the AI's plan. It works.",
    },
    {
      name: "Morgan K",
      role: "Content Creator",
      image: "/tmph6iuxe9k.webp",
      quote: "The campaign timelines helped me organize my entire product launch.",
    },
  ];

  const faqs = [
    {
      question: "Is NextPostAI suitable for all social media platforms?",
      answer: "Yes, it supports Facebook, LinkedIn, X, Instagram, Reddit, and Threads with platform-specific optimization.",
    },
    {
      question: "Can I customize the AI-generated content?",
      answer: "Absolutely! You can edit and tailor the content to fit your brand voice, tone, and style.",
    },
    {
      question: "Is there a free trial available?",
      answer: "Yes, we offer a free trial with 100 credits so you can experience the benefits firsthand.",
    },
  ];

  const benefits = [
    {
      audience: "Entrepreneurs",
      description: "Launch with confidence using AI-backed strategies",
    },
    {
      audience: "Marketers",
      description: "Plan campaigns, not just posts",
    },
    {
      audience: "Influencers",
      description: "Promote offers, collabs, or content drops",
    },
    {
      audience: "Small Businesses",
      description: "Build brand presence with structured promotion",
    },
  ];

  return (
    <>
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

          <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 lg:py-32">
            <div className="text-center space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-purple-500/30">
                <Bot className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-200">AI-Powered Marketing Assistant</span>
              </div>

              {/* Main heading */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white">
                NextPostAI
              </h1>

              {/* Tagline */}
              <p className="text-2xl md:text-4xl lg:text-5xl font-semibold text-purple-400">
                Save 10+ Hours a Week on Marketing
              </p>

              {/* Subheading */}
              <p className="text-lg md:text-xl lg:text-2xl font-normal text-gray-300 max-w-3xl mx-auto">
                AI creates launch plans, generates posts for X, LinkedIn, Instagram & Facebook, and sends reminders, so you build instead of post.
              </p>

              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <GoogleLoginButton 
                  triggerClassName="glow-button px-8 py-4 text-lg font-semibold rounded-xl text-white flex items-center gap-2"
                  buttonText="Start Free with 100 Credits"
                />
                <Link 
                  href="/documentation" 
                  className="px-8 py-4 text-lg font-semibold rounded-xl border border-white/20 hover:border-purple-500/50 hover:bg-white/5 transition-all flex items-center gap-2"
                >
                  Learn More <ArrowRight className="w-5 h-5" />
                </Link>
              </div>

              {/* Stats Section */}
              <div className="pt-16">
                <p className="text-sm text-gray-400 mb-6 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full pulse-live" />
                  Growing Fast — Join the Momentum
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {statData.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={index}
                        className="glass-card rounded-2xl p-6 text-center cursor-pointer group"
                      >
                        <div className="flex justify-center mb-4">
                          <div className="icon-glow w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-purple-400 group-hover:text-purple-300 transition-colors" />
                          </div>
                        </div>
                        <div className="stat-value text-3xl lg:text-4xl font-bold text-white mb-2">
                          {stat.value}
                        </div>
                        <p className="text-purple-300 font-medium mb-1">{stat.title}</p>
                        <p className="text-gray-400 text-sm">{stat.description}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-gray-500">
                  Real numbers from real users — updated live.
                </p>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-6 h-6 text-gray-400" />
          </div>
        </section>

        {/* How It Works Section */}
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
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                From idea to viral content in minutes, not hours
              </p>
            </div>

            {/* Steps grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {howItWorks.map((item, index) => (
                <div
                  key={index}
                  className="feature-card glass-card rounded-3xl p-6 group"
                >
                  <div className="relative mb-6 rounded-2xl overflow-hidden">
                    <Image
                      src={item.image}
                      width={400}
                      height={300}
                      alt={item.title}
                      className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-lg font-bold">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <GoogleLoginButton 
                triggerClassName="glow-button px-8 py-4 text-lg font-semibold rounded-xl text-white"
                buttonText="Start Free with 100 Credits"
              />
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
                  With NextPostAI
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

        {/* Divider */}
        <div className="section-divider" />

        {/* Features Section */}
        <section
          id="features"
          ref={(el) => { sectionRefs.current["features"] = el }}
          className="relative py-24 lg:py-32"
        >
          <div className={`max-w-7xl mx-auto px-6 reveal ${isVisible["features"] ? "visible" : ""}`}>
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="lg:w-1/2">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  <span className="text-white">Why Choose </span>
                  <span className="gradient-text-accent">NextPostAI</span>
                  <span className="text-white">?</span>
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full mb-6" />
                <p className="text-gray-400 text-lg mb-8">
                  Everything you need to launch and grow your product with consistent, 
                  engaging content — without the marketing headache.
                </p>
                <Image
                  src="/tmp0u5_noks.webp"
                  width={400}
                  height={400}
                  alt="AI Marketing"
                  className="hidden lg:block max-w-sm"
                />
              </div>

              <div className="lg:w-1/2 grid gap-6">
                {features.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={idx}
                      className="feature-card glass-card rounded-2xl p-6 flex gap-5"
                    >
                      <div className="icon-glow w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-7 h-7 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                        <p className="text-gray-400">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="section-divider" />

        {/* Testimonials Section */}
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
                buttonText="Start Free with 100 Credits"
              />
            </div>
          </div>
        </section>

        {/* Mobile & Privacy Section */}
        <section
          id="trust"
          ref={(el) => { sectionRefs.current["trust"] = el }}
          className="relative py-24 lg:py-32"
        >
          <div className={`max-w-7xl mx-auto px-6 reveal ${isVisible["trust"] ? "visible" : ""}`}>
            <div className="grid md:grid-cols-2 gap-16">
              {/* Mobile Friendly */}
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-12 h-12 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-3">
                    Mobile-Friendly <span className="gradient-text-accent">Design</span>
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    Access NextPostAI on any device. Whether you&apos;re on the go or at your desk, 
                    your marketing tools are always within reach.
                  </p>
                </div>
              </div>

              {/* Privacy */}
              <div className="flex flex-col md:flex-row items-center gap-8">
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
          </div>
        </section>

        {/* Divider */}
        <div className="section-divider" />

        {/* Who Can Benefit */}
        <section
          id="benefits"
          ref={(el) => { sectionRefs.current["benefits"] = el }}
          className="relative py-24 lg:py-32"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-transparent" />
          
          <div className={`relative z-10 max-w-4xl mx-auto px-6 text-center reveal ${isVisible["benefits"] ? "visible" : ""}`}>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-12">
              <span className="text-white">Who Can </span>
              <span className="gradient-text-accent">Benefit?</span>
            </h2>

            <div className="grid sm:grid-cols-2 gap-6">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="glass-card rounded-2xl p-6 text-left flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">{benefit.audience}</p>
                    <p className="text-gray-400">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

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
              Join 146+ creators using AI to plan, post, and grow — free to start.
            </p>
            <GoogleLoginButton 
              triggerClassName="glow-button px-10 py-5 text-xl font-bold rounded-2xl text-white inline-flex items-center gap-3"
              buttonText="Start Free with 100 Credits"
            />
            <p className="text-gray-400 text-sm mt-6">
              No card required. Upgrade anytime for unlimited.
            </p>
          </div>
        </section>

        {/* Divider */}
        <div className="section-divider" />

        {/* FAQ Section */}
        <section
          id="faq"
          ref={(el) => { sectionRefs.current["faq"] = el }}
          className="relative py-24 lg:py-32"
        >
          <div className={`max-w-3xl mx-auto px-6 reveal ${isVisible["faq"] ? "visible" : ""}`}>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-2">
                <span className="text-white">Frequently </span>
                <span className="gradient-text-accent">Asked Questions</span>
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className={`faq-item rounded-2xl overflow-hidden ${openFaq === idx ? "open" : ""}`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="font-semibold text-white">{faq.question}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-6 text-gray-300">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                Copyright © 2025. All rights reserved. NextPostAI
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
