import Head from "next/head"

export default function TryPage() {
    return (
        <main className="bg-[#0B0D12] text-white antialiased">
            <Head>
                <title>ViralPost - Create &amp; Auto-Post</title>
            </Head>

            {/* Top Bar */}
            <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0D12]/80 backdrop-blur">
                <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-gradient-to-br from-indigo-500 to-cyan-400" />
                        <span className="font-semibold tracking-tight">ViralPost</span>
                    </div>
                    <nav className="hidden sm:flex items-center gap-2">
                        <a
                            className="px-3 py-1.5 text-sm text-white/80 hover:text-white"
                            href="#"
                        >
                            Features
                        </a>
                        <a
                            className="px-3 py-1.5 text-sm text-white/80 hover:text-white"
                            href="#"
                        >
                            Pricing
                        </a>
                        <a
                            className="px-3 py-1.5 text-sm text-white/80 hover:text-white"
                            href="#"
                        >
                            Docs
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="px-3 py-1.5 text-sm rounded border border-white/15 hover:border-white/30"
                        >
                            Log in
                        </button>
                        <button
                            type="button"
                            className="px-3 py-1.5 text-sm rounded bg-white text-black hover:bg-white/90"
                        >
                            Get started
                        </button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 pb-28">
                {/* Hero */}
                <section className="text-center pt-10 sm:pt-16">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
                        <span>Make posts that travel</span>
                        <span className="text-white/30">•</span>
                        <span>Multi-platform auto-posting</span>
                    </div>
                    <h1 className="mt-5 text-3xl sm:text-5xl font-semibold tracking-tight">
                        Create viral posts. Auto-post everywhere.
                    </h1>
                    <p className="mt-3 text-white/70 max-w-2xl mx-auto">
                        Draft once. Tailor per platform. Queue and go. No fluff, just the
                        essentials to ship daily.
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-2">
                        <button
                            type="button"
                            className="px-4 py-2 rounded bg-white text-black text-sm font-medium"
                        >
                            Quick Generate
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 rounded border border-white/20 text-sm"
                        >
                            Explore Templates
                        </button>
                    </div>
                </section>
                {/* Composer / Planner (Mobile-first stack) */}
                <section className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Composer Card */}
                    <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <h2 className="font-medium">Composer</h2>
                            <div className="flex gap-1">
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-xs rounded border border-white/15"
                                >
                                    AI Assist
                                </button>
                                <button
                                    type="button"
                                    className="px-3 py-1.5 text-xs rounded border border-white/15"
                                >
                                    Save Draft
                                </button>
                            </div>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Project / Goal */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs text-white/60 mb-1">
                                        Post text
                                    </label>
                                    <div className="rounded-lg border border-white/10 bg-black/20 p-3 min-h-[120px] text-sm text-white/80">
                                        Start with a hook. Promise value. Add proof. Call to action.
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">Tone</label>
                                        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-sm">
                                            Witty
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            Style
                                        </label>
                                        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-sm">
                                            Punchy
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">Goal</label>
                                        <div className="rounded-lg border border-white/10 bg-black/20 p-2 text-sm">
                                            Clicks
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Platform Selector */}
                            <div>
                                <label className="block text-xs text-white/60 mb-2">
                                    Platforms
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-full border border-white/15 bg-white/10"
                                    >
                                        X
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-full border border-white/15"
                                    >
                                        Instagram
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-full border border-white/15"
                                    >
                                        LinkedIn
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-full border border-white/15"
                                    >
                                        Facebook
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-full border border-white/15"
                                    >
                                        TikTok
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-full border border-white/15"
                                    >
                                        Reddit
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 text-xs rounded-full border border-white/15"
                                    >
                                        YouTube
                                    </button>
                                </div>
                            </div>
                            {/* Variant Tabs (static) */}
                            <div>
                                <div className="flex gap-2 text-xs">
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded border border-white/15 bg-white/10"
                                    >
                                        Universal
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded border border-white/15"
                                    >
                                        Thread
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded border border-white/15"
                                    >
                                        Carousel
                                    </button>
                                    <button
                                        type="button"
                                        className="px-3 py-1.5 rounded border border-white/15"
                                    >
                                        Short
                                    </button>
                                </div>
                                <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-white/80">
                                    <div className="text-white/60 text-xs mb-1">
                                        Preview • Universal
                                    </div>
                                    Hook line that stops the scroll. Two lines of value. CTA to learn
                                    more.
                                </div>
                            </div>
                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded bg-white text-black text-sm font-medium"
                                >
                                    Generate Variations
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded border border-white/20 text-sm"
                                >
                                    Optimize Per Platform
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded border border-white/20 text-sm"
                                >
                                    Add Media
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded border border-white/20 text-sm"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Planner / Queue */}
                    <aside className="rounded-xl border border-white/10 bg-white/5">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="font-medium">Schedule &amp; Queue</h2>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Quick Schedule */}
                            <div className="rounded-lg border border-white/10 p-3">
                                <div className="text-xs text-white/60 mb-2">Quick schedule</div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded border border-white/10 bg-black/20 p-2 text-center text-xs">
                                        Today 5:00 PM
                                    </div>
                                    <div className="rounded border border-white/10 bg-black/20 p-2 text-center text-xs">
                                        Tomorrow 9:00 AM
                                    </div>
                                    <div className="rounded border border-white/10 bg-black/20 p-2 text-center text-xs">
                                        Mon 11:00 AM
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="mt-3 w-full px-3 py-2 rounded bg-white text-black text-sm"
                                >
                                    Schedule Post
                                </button>
                            </div>
                            {/* Auto-Post Window */}
                            <div className="rounded-lg border border-white/10 p-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs text-white/60">Auto-post window</div>
                                    <button
                                        type="button"
                                        className="px-2 py-1 text-xs rounded border border-white/15"
                                    >
                                        Edit
                                    </button>
                                </div>
                                <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] text-white/60">
                                    <div className="rounded bg-white/5 p-2 text-center">S</div>
                                    <div className="rounded bg-white/10 p-2 text-center">M</div>
                                    <div className="rounded bg-white/5 p-2 text-center">T</div>
                                    <div className="rounded bg-white/10 p-2 text-center">W</div>
                                    <div className="rounded bg-white/5 p-2 text-center">T</div>
                                    <div className="rounded bg-white/10 p-2 text-center">F</div>
                                    <div className="rounded bg-white/5 p-2 text-center">S</div>
                                </div>
                            </div>
                            {/* Accounts */}
                            <div className="rounded-lg border border-white/10 p-3">
                                <div className="text-xs text-white/60 mb-2">Connected accounts</div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded bg-white" />
                                            <span className="text-sm">X @startup</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-xs rounded border border-white/15"
                                        >
                                            Manage
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded bg-pink-500" />
                                            <span className="text-sm">Instagram / brand</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-xs rounded border border-white/15"
                                        >
                                            Connect
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded bg-blue-500" />
                                            <span className="text-sm">Facebook Page</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="px-2 py-1 text-xs rounded border border-white/15"
                                        >
                                            Connect
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </section>
                {/* Templates */}
                <section className="mt-10">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">High-performing Templates</h3>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="px-3 py-1.5 text-xs rounded border border-white/15"
                            >
                                View all
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <div className="text-xs text-white/60 mb-1">Hook • Short</div>
                            <div className="text-sm text-white/80">
                                “You’re doing X wrong. Try Y instead.”
                            </div>
                            <button
                                type="button"
                                className="mt-3 w-full px-3 py-2 rounded border border-white/20 text-sm"
                            >
                                Use Template
                            </button>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <div className="text-xs text-white/60 mb-1">Story • Thread</div>
                            <div className="text-sm text-white/80">
                                Problem → Insight → Steps → CTA
                            </div>
                            <button
                                type="button"
                                className="mt-3 w-full px-3 py-2 rounded border border-white/20 text-sm"
                            >
                                Use Template
                            </button>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <div className="text-xs text-white/60 mb-1">List • Carousel</div>
                            <div className="text-sm text-white/80">
                                “7 posts that grew us to 10k.”
                            </div>
                            <button
                                type="button"
                                className="mt-3 w-full px-3 py-2 rounded border border-white/20 text-sm"
                            >
                                Use Template
                            </button>
                        </div>
                    </div>
                </section>
                {/* Social Proof / CTA */}
                <section className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6 text-center">
                    <p className="text-white/70">
                        Built for creators, founders, and teams shipping daily.
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                        <button
                            type="button"
                            className="px-4 py-2 rounded bg-white text-black text-sm font-medium"
                        >
                            Start Free
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 rounded border border-white/20 text-sm"
                        >
                            See Pricing
                        </button>
                    </div>
                </section>
            </main>
            {/* Footer */}
            <footer className="border-t border-white/10">
                <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-white/60 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <div>©️ 2025 ViralPost</div>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-white">
                            Privacy
                        </a>
                        <a href="#" className="hover:text-white">
                            Terms
                        </a>
                        <a href="#" className="hover:text-white">
                            Contact
                        </a>
                    </div>
                </div>
            </footer>
        </main>

    )
}