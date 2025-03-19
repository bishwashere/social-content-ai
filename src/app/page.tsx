"use client"
import { useState } from "react";
// Dynamic import for non-critical components
import dynamic from 'next/dynamic';
const GoogleLoginButton = dynamic(() => import('@/components/common/google-login-button'), { ssr: false });

import Image from "next/image";

export default function HomeV3() {

  return (
    <div className="bg-gradient-to-t from-teal-600 to-cyan-500 min-h-screen flex flex-col justify-between">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <header className="text-center mb-12">
          <h1 className="text-5xl text-white mb-4 drop-shadow-md">
            NextPostAI
          </h1>
          <p className="text-xl text-teal-100 max-w-lg mx-auto">
            Generate ready-to-post Content for Facebook, LinkedIn, X, and Instagram.
          </p>
        </header>

        {/* Static Features Section */}
        <div className="max-w-6xl mx-auto mb-12">
          {/* Call-to-Action */}
          <div className="flex justify-center mb-8">
            <GoogleLoginButton triggerClassName="min-w-32" />
          </div>

          {/* Single Box for Features */}
          <div className="p-6 rounded-2xl bg-teal-700/30 border border-teal-500">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">
              Features
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Feature 1: Content Generator */}
              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">
                  1. Viral Content Generator
                </h3>
                <p className="text-teal-100 text-sm mb-4">
                  AI that is tuned to generate viral content.
                </p>
              </div>

              {/* Feature 2: Content Planner */}
              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">2. Content Planner</h3>
                <p className="text-teal-100 text-sm mb-4">
                  Enter when you make posts, and get auto alert to post next time.
                </p>
              </div>

              {/* Feature 3: Community Wall */}
              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">3. Get Ideas</h3>
                <p className="text-teal-100 text-sm mb-4">
                  Get inspiring ideas from other people's projects + content. Or share yours.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Community Wall Preview Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            ✨ What others are sharing on NextPostAI ✨
          </h2>
          <div className="w-full">
            <Image
              src="/wall-preview.png"
              alt="Community Wall Full Preview"
              width={1024}
              height={576}
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>

        {/* Strategy Board Preview Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            📆 Content Planner 📆
          </h2>
          <div className="w-full">
            <Image
              src="/dashboard-preview.png"
              alt="Strategy Board Full Preview"
              width={1024}
              height={576}
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>

        {/* old way - new way */}
        <div className="w-full max-w-[450px] mx-auto mb-12">
          <h3 className="text-white font-semibold mb-4 text-center text-2xl">Why use NextPostAI?</h3>
          {/* Old Way in a Box */}
          <div className="p-6 rounded-xl bg-teal-700/50 border border-teal-500 mb-8 mx-auto">
            <h3 className="text-white font-semibold mb-4 text-left text-xl">Old Way</h3>
            <ul className="text-teal-100 text-lg text-left">
              <li><span className="text-red-500">❌</span> 5-10 hours analyzing trends</li>
              <li><span className="text-red-500">❌</span> Inconsistent posting</li>
              <li><span className="text-red-500">❌</span> Manual content creation</li>
              <li><span className="text-red-500">❌</span> AI hallucinates</li>
            </ul>
          </div>

          {/* New Way in a Box */}
          <div className="p-6 rounded-xl bg-teal-700/50 border border-teal-500 mx-auto">
            <h3 className="text-white font-semibold mb-4 text-left text-xl">New Way with NextPostAI</h3>
            <ul className="text-teal-100 text-lg text-left">
              <li><span className="text-green-500">✔️</span> Instant viral AI-generated content</li>
              <li><span className="text-green-500">✔️</span> Automated reminders</li>
              <li><span className="text-green-500">✔️</span> Community inspiration</li>
              <li><span className="text-green-500">✔️</span> Effortless posting schedule</li>
            </ul>
          </div>
        </div>







        {/* Call-to-Action */}
        <div className="flex justify-center mb-8">
          <GoogleLoginButton triggerClassName="min-w-32" />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-teal-800/50 py-6 text-center">
        <p className="text-teal-200 text-sm">
          © 2025 NextPostAI. All rights reserved.
        </p>
      </div>

      {/* Inline Styles for Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}