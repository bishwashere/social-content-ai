import GoogleLoginButton from "@/components/common/google-login-button";

export default function HomeV3() {
  return (
    <div className="bg-gradient-to-t from-teal-600 to-cyan-500 min-h-screen flex flex-col justify-between">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-md">
            SocialAI
          </h1>
          <p className="text-xl text-teal-100 max-w-lg mx-auto">
            Craft AI-powered social media posts that engage and convert—effortlessly!
          </p>
          <p className="text-md text-teal-200 mt-2">
            Generate, optimize, and track content for TikTok, Instagram, and Facebook.
          </p>
        </header>
        {/* Top Button */}
        <div className="flex justify-center mb-8">
          <GoogleLoginButton triggerClassName="min-w-32" />
        </div>

        {/* Features Section */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Why Choose SocialAI?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-teal-700/50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition">
              <h3 className="text-white font-semibold mb-2">Smart Content Generation</h3>
              <p className="text-teal-100 text-sm">
                Input a prompt and get tailored posts for any platform with AI precision.
              </p>
            </div>
            <div className="bg-teal-700/50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition">
              <h3 className="text-white font-semibold mb-2">Post Tracking</h3>
              <p className="text-teal-100 text-sm">
                Log and manage your posted content with date tracking for easy oversight.
              </p>
            </div>
            <div className="bg-teal-700/50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition">
              <h3 className="text-white font-semibold mb-2">Multi-Platform Magic</h3>
              <p className="text-teal-100 text-sm">
                Optimize for TikTok, Instagram, and Facebook with a single click.
              </p>
            </div>
          </div>
        </div>

        {/* Demo Section */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-semibold text-white mb-4">See It in Action</h2>
          <p className="text-teal-100 max-w-2xl mx-auto mb-6">
            Try a sample prompt: "Create an inspiring post for Instagram." Result: "Don’t just exist, bloom. You have sunshine within you. Let it shine! 🌟 #Inspiration #Growth #Motivation #YouGotThis"
          </p>
          <p className="text-teal-200 text-sm">
            Track it: Logged on Mar 08, 2025, for Instagram review.
          </p>
        </div>
      </div>

      {/* Bottom Button & Footer */}
      <div className="bg-teal-800/50 py-6 text-center">
        <div className="mb-4">
          <GoogleLoginButton triggerClassName="min-w-32" />
        </div>
        <p className="text-teal-200 text-sm">© 2025 SocialAI. All rights reserved.</p>
      </div>
    </div>
  );
}