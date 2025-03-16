import GoogleLoginButton from "@/components/common/google-login-button";
import Image from "next/image"; // Import the Image component from Next.js

export default function HomeV3() {
  return (
    <div className="bg-gradient-to-t from-teal-600 to-cyan-500 min-h-screen flex flex-col justify-between">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-md">
            NextPostAI
          </h1>
          <p className="text-xl text-teal-100 max-w-lg mx-auto">
            Craft AI-powered social media posts that engage and convert—effortlessly!
          </p>
        </header>

        {/* Static Features Section */}
        <div className="max-w-6xl mx-auto mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Explore NextPostAI Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1: Wall */}
            <div className="bg-teal-700/50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition">
              <h3 className="text-white font-semibold mb-2">Community Wall</h3>
              <p className="text-teal-100 text-sm mb-4">
                Share your projects and see what others are creating. Inspire and get inspired!
              </p>
              <div className="bg-teal-800/70 h-32 rounded-lg overflow-hidden relative">
                <Image
                  src="/wall.png" // Placeholder image for Wall
                  alt="Community Wall Preview"
                  layout="fill" // Fills the parent div
                  objectFit="cover" // Ensures the image covers the area
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Feature 2: Content Generator */}
            <div className="bg-teal-700/50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition">
              <h3 className="text-white font-semibold mb-2">Content Generator</h3>
              <p className="text-teal-100 text-sm mb-4">
                Generate posts instantly—no project needed. Tailored for any platform!
              </p>
              <div className="bg-teal-800/70 h-32 rounded-lg overflow-hidden relative">
                <Image
                  src="/generator.png" // Placeholder image for Content Generator
                  alt="Content Generator Preview"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Feature 3: Dashboard */}
            <div className="bg-teal-700/50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition">
              <h3 className="text-white font-semibold mb-2">Dashboard</h3>
              <p className="text-teal-100 text-sm mb-4">
                Track your post history and performance with ease.
              </p>
              <div className="bg-teal-800/70 h-32 rounded-lg overflow-hidden relative">
                <Image
                  src="/dashboard.png" // Placeholder image for Dashboard
                  alt="Dashboard Preview"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Call-to-Action */}
        <div className="flex justify-center mb-8">
          <GoogleLoginButton triggerClassName="min-w-32" />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-teal-800/50 py-6 text-center">
        <p className="text-teal-200 text-sm">© 2025 NextPostAI. All rights reserved.</p>
      </div>
    </div>
  );
}