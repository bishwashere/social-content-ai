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
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-md">
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
          <div className="p-6 rounded-xl bg-teal-700/30 border border-teal-500">
            <h2 className="text-2xl font-semibold text-white mb-6 text-center">
              What NextPostAI provides?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Feature 1: Content Generator */}
              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">
                  1. AI Content Generator
                </h3>
                <p className="text-teal-100 text-sm mb-4">
                  Creates viral content for Facebook, LinkedIn, X, and Instagram.
                </p>
              </div>

              {/* Feature 2: Strategy Board */}
              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">2. Strategy Board</h3>
                <p className="text-teal-100 text-sm mb-4">
                  Lets you manually track posting history and automatically alerts you when posts are due.
                </p>
              </div>

              {/* Feature 3: Community Wall */}
              <div className="text-center">
                <h3 className="text-white font-semibold mb-2">3. Community Wall</h3>
                <p className="text-teal-100 text-sm mb-4">
                  Lets you share projects with others, if you choose!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Community Wall Preview Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            ✨ Discover Content Created by Others with NextPostAI ✨
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
            Explore the Strategy Board
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