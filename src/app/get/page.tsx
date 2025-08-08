"use client"
import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, CalendarDays, Sparkles, Rocket, ArrowRight, PlayCircle, BarChart2, Facebook, Twitter, Linkedin, Instagram, Share2, Flame, Loader2, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import GoogleLoginButton from "@/components/common/google-login-button";
import { useRouter } from "next/navigation";

// Single-file landing page component. Drop into a Next.js app's /app/page.tsx or as a route.
// Uses shadcn/ui + Tailwind + framer-motion + lucide-react.

const PLATFORMS = [
  { key: "twitter", label: "X / Twitter", icon: <Twitter className="w-4 h-4" /> },
  { key: "linkedin", label: "LinkedIn", icon: <Linkedin className="w-4 h-4" /> },
  { key: "instagram", label: "Instagram", icon: <Instagram className="w-4 h-4" /> },
  { key: "facebook", label: "Facebook", icon: <Facebook className="w-4 h-4" /> },
  { key: "threads", label: "Threads", icon: <Share2 className="w-4 h-4" /> },
  { key: "reddit", label: "Reddit", icon: <Share2 className="w-4 h-4" /> },
];

const TONES = ["Witty", "Professional", "Inspiring", "Casual", "Bold"] as const;

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function generatePlan(intensity: number, platforms: string[]) {
  // intensity: 1 (light) ~ 3 (aggressive)
  // Return a 4-week plan with days and platforms picked.
  const weeks = 4;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const postsPerWeek = intensity === 1 ? 3 : intensity === 2 ? 5 : 7;

  // Simple spread algorithm: pick evenly spaced days each week
  const chosenDayIdx = new Set<number>();
  for (let i = 0; i < postsPerWeek; i++) chosenDayIdx.add(Math.floor((i * 7) / postsPerWeek));

  const plan = [] as { week: number; dayName: string; platforms: string[] }[];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      if (chosenDayIdx.has(d)) {
        // Rotate platforms each post
        const picks = platforms.length
          ? platforms.filter((_, i) => (i + w + d) % 2 === 0 || intensity === 3) // more platforms when aggressive
          : [];
        plan.push({ week: w + 1, dayName: days[d], platforms: picks });
      }
    }
  }
  return { days, plan };
}

function sampleViralPost(topic: string, tone: typeof TONES[number]) {
  const hooks = {
    Witty: "Hot take:",
    Professional: "Insight:",
    Inspiring: "Reminder:",
    Casual: "Real talk:",
    Bold: "Unpopular opinion:",
  } as const;
  const ending = {
    Witty: "Thoughts?",
    Professional: "Agree?",
    Inspiring: "Who's in?",
    Casual: "What do you think?",
    Bold: "Prove me wrong.",
  } as const;
  const h = hooks[tone];
  const e = ending[tone];
  return `${h} ${topic} doesn't need luck—just a repeatable system. 30 days, focused channels, consistent voice. Ship ideas fast, measure, iterate. ${e}`;
}

export default function LandingPage() {
  const [intensity, setIntensity] = useState<number>(2); // 1..3
  const [selected, setSelected] = useState<string[]>(["twitter", "linkedin", "instagram"]);
  const [topic, setTopic] = useState("Launch day hype for a new app");
  const [tone, setTone] = useState<typeof TONES[number]>("Witty");
  const [generating, setGenerating] = useState(false);
  const [post, setPost] = useState<string>(sampleViralPost(topic, tone));

  const { plan, days } = useMemo(() => generatePlan(intensity, selected), [intensity, selected]);

  const togglePlatform = (key: string) => {
    setSelected((cur) => (cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key]));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    // Mock AI delay
    await new Promise((r) => setTimeout(r, 700));
    setPost(sampleViralPost(topic, tone));
    setGenerating(false);
  };
  const router = useRouter()
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Rocket className="w-5 h-5" />
            <span>NextPostAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features" className="hover:text-slate-600">Features</a>
            <a href="#builder" className="hover:text-slate-600">Campaign Builder</a>
            <a href="#generator" className="hover:text-slate-600">Viral Posts</a>
            <a href="#faq" className="hover:text-slate-600">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <GoogleLoginButton
              trigger={(
                <Button variant="ghost" className="hidden sm:inline-flex">Log in</Button>
              )}
              gotoDashboard={(
                <span></span>
              )}
            />
            <GoogleLoginButton
              trigger={(
                <Button className="rounded-2xl">Get Started</Button>
              )}
              gotoDashboard={(
                <Button
                  onClick={() => router.push('/project')}
                  className="rounded-2xl">Dashboard</Button>
              )}
            />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-10">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Plan a <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">30‑day campaign</span> in minutes.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Pick your channels, set intensity, and preview a full month. Generate viral‑style posts for each slot—then schedule or publish.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="rounded-2xl">
                <a href="#builder" className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />Try the Campaign Builder</a>
              </Button>
              <Button variant="outline" asChild className="rounded-2xl">
                <a href="#generator" className="flex items-center gap-2"><Sparkles className="w-4 h-4" />See Viral Post Demo</a>
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2"><Check className="w-4 h-4" /> No credit card</div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4" /> 2‑minute setup</div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4" /> Cancel anytime</div>
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <Card className="shadow-xl border-indigo-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-medium text-slate-700"><CalendarDays className="w-4 h-4" /> Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 text-center text-xs">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="font-medium text-slate-600">{d}</div>
                  ))}
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl border bg-gradient-to-br from-indigo-50 to-fuchsia-50 flex items-center justify-center text-[10px] text-slate-600">
                      Slot
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Logos */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 opacity-80">
          {[
            "ProductHunt", "IndieHackers", "Reddit", "LinkedIn Creators"
          ].map((x) => (
            <div key={x} className="rounded-xl border p-4 text-center text-xs">Featured on {x}</div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" /> 30‑Day Planner</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Auto-spread posts across the month with channel rotation. Adjust intensity to go from light cadence to daily domination.
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5" /> Viral Post Generator</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Click to draft scroll-stopping hooks, CTAs, and snippets tuned to platform norms and your brand voice.
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart2 className="w-5 h-5" /> Measure & Iterate</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              See what landed each week, tweak tone and channels, and keep compounding reach.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Interactive Campaign Builder */}
      <section id="builder" className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-2xl font-semibold">Try the Campaign Builder</h2>
            <p className="mt-2 text-slate-600">Pick platforms and choose your posting intensity. We’ll preview your month.</p>

            <div className="mt-6 space-y-6">
              <div>
                <div className="text-sm font-medium mb-3">Platforms</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PLATFORMS.map((p) => (
                    <label key={p.key} className={classNames(
                      "flex items-center gap-2 rounded-xl border p-3 cursor-pointer",
                      selected.includes(p.key) ? "border-indigo-500 bg-indigo-50" : "hover:border-slate-300"
                    )}>
                      <Switch checked={selected.includes(p.key)} onCheckedChange={() => togglePlatform(p.key)} />
                      <span className="flex items-center gap-2 text-sm">{p.icon}{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Intensity</div>
                  <div className="text-xs text-slate-500">{intensity === 1 ? "Light (~3/wk)" : intensity === 2 ? "Balanced (~5/wk)" : "Aggressive (~7/wk)"}</div>
                </div>
                <Slider min={1} max={3} step={1} value={[intensity]} onValueChange={(v) => setIntensity(v[0] ?? 2)} />
              </div>

              <div className="text-xs text-slate-500">* Demo only. The full product lets you set start dates, timezones, and per-channel timing.</div>
            </div>
          </div>

          {/* Calendar Preview */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">30‑Day Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center">
                {days.map((d) => (
                  <div key={d} className="text-xs font-medium text-slate-600">{d}</div>
                ))}
                {Array.from({ length: 4 }).map((_, w) => (
                  Array.from({ length: 7 }).map((_, d) => {
                    const slot = plan.find((p) => p.week === w + 1 && p.dayName === days[d]);
                    return (
                      <div key={`${w}-${d}`} className={classNames(
                        "rounded-xl border aspect-square p-1 flex flex-col items-center justify-center gap-1",
                        slot ? "bg-indigo-50 border-indigo-200" : "bg-white"
                      )}>
                        <div className="text-[10px] text-slate-500">W{w + 1}</div>
                        {slot ? (
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {slot.platforms.slice(0, 3).map((pf) => {
                              const i = PLATFORMS.find((x) => x.key === pf)?.icon;
                              return <div key={pf} className="p-1 rounded-md bg-white border">{i}</div>;
                            })}
                            {slot.platforms.length > 3 && (
                              <div className="text-[10px] text-slate-600">+{slot.platforms.length - 3}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-300">—</div>
                        )}
                      </div>
                    );
                  })
                ))}
              </div>
              <div className="mt-4 text-xs text-slate-500">Posting days are auto‑distributed. Channels rotate per slot.</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Viral Post Generator Demo */}
      <section id="generator" className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2"><Flame className="w-5 h-5" /> Viral Post Demo</h2>
            <p className="mt-2 text-slate-600">Preview the kind of copy our generator produces for your campaign slots.</p>
            <div className="mt-6 space-y-4">
              <div>
                <div className="text-sm font-medium mb-1">Topic</div>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Announcing a beta waitlist" />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Tone</div>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <Button key={t} variant={t === tone ? "default" : "outline"} className="rounded-2xl" onClick={() => setTone(t)}>
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleGenerate} className="rounded-2xl" disabled={generating}>
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span className="ml-2">Generate sample</span>
                </Button>
                <Button variant="outline" className="rounded-2xl" asChild>
                  <a href="#cta"><ArrowRight className="w-4 h-4 mr-2" />Start my 30‑day plan</a>
                </Button>
              </div>
            </div>
          </div>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Sample Output</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea value={post} onChange={(e) => setPost(e.target.value)} className="min-h-[180px]" />
              <div className="mt-2 text-xs text-slate-500">* Real app supports per‑platform formats, hashtags, image/video, and scheduling.</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-3xl border bg-white p-8 grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-semibold">Simple pricing</h3>
            <p className="mt-2 text-slate-600">Start free. Upgrade when you need more seats and channels.</p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2"><Check className="w-4 h-4" /> 30‑day planner & generator</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4" /> Schedule & publish</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4" /> Analytics snapshots</li>
            </ul>
          </div>
          <div className="rounded-2xl border p-6 bg-gradient-to-br from-slate-50 to-white">
            <div className="text-4xl font-bold">$0</div>
            <div className="text-sm text-slate-500">Starter • then from $19/mo</div>
            <div className="mt-4 flex gap-3">
              <Button className="rounded-2xl" id="cta">Create free account</Button>
              <Button variant="outline" className="rounded-2xl">Book a demo</Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-4 py-12">
        <h3 className="text-xl font-semibold mb-6">FAQ</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Does this actually post for me?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">Yes. Connect your channels and schedule or publish instantly from the calendar.</CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Can I edit the generated posts?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">Absolutely. Tweak tone, add media, and save templates per platform.</CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Do you support teams?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">Invite collaborators, assign roles, and track who scheduled what.</CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Which platforms are supported?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">X/Twitter, LinkedIn, Instagram, Facebook, Threads, Reddit — with more on the way.</CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2"><Rocket className="w-4 h-4" /> NextPostAI</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-800">Privacy</a>
            <a href="#" className="hover:text-slate-800">Terms</a>
            <a href="#" className="hover:text-slate-800 flex items-center gap-1"><Github className="w-4 h-4" />GitHub</a>
          </div>
          <div>© {new Date().getFullYear()} NextPostAI</div>
        </div>
      </footer>
    </div>
  );
}
