"use client"
import { useState } from "react";
import GoogleLoginButton from "@/components/common/google-login-button";
import Image from "next/image";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";

export default function HomeV3() {
  // State to manage which image is expanded, typed as string or null
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Handle image click to expand, with index typed as string
  const handleImageClick = (index: string) => {
    setExpandedImage(index);
  };

  // Close expanded view when clicking outside
  const handleCloseExpanded = () => {
    setExpandedImage(null);
  };

  // Handle navigation (optional, can remove if not needed)
  const handleNavigate = (direction: "left" | "right") => {
    if (expandedImage !== null) {
      const images = ["generator.png", "dashboard.png", "wall.png"];
      const currentIndex = images.indexOf(expandedImage);
      let newIndex;
      if (direction === "left") {
        newIndex = (currentIndex - 1 + images.length) % images.length;
      } else {
        newIndex = (currentIndex + 1) % images.length;
      }
      setExpandedImage(images[newIndex]);
    }
  };

  return (
    <div className="bg-gradient-to-t from-teal-600 to-cyan-500 min-h-screen flex flex-col justify-between">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-md">
            NextPostAI
          </h1>
          <p className="text-xl text-teal-100 max-w-lg mx-auto">
            <span className="bg-white text-teal-600 px-1 rounded">Build</span> and{" "}
            <span className="bg-white text-teal-600 px-1 rounded">Grow</span> Your Brand Across Facebook, LinkedIn, Twitter(X), and Instagram
          </p>
        </header>

        {/* Static Features Section */}
        <div className="max-w-6xl mx-auto mb-12">
          {/* Call-to-Action */}
          <div className="flex justify-center mb-8">
            <GoogleLoginButton triggerClassName="min-w-32" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            What NextPostAI provides?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 2: Content Generator */}
            <div className="bg-teal-700/50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition">
              <h3 className="text-white font-semibold mb-2">
                AI Content Generator
              </h3>
              <p className="text-teal-100 text-sm mb-4">
                Generate posts instantly for Facebook, LinkedIn, Twitter(X), and Instagram.
              </p>
              <div
                className="bg-teal-800/70 h-32 rounded-lg overflow-hidden relative cursor-pointer"
                onClick={() => handleImageClick("generator.png")}
              >
                <Image
                  src="/generator.png"
                  alt="Content Generator Preview"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Feature 3: Strategy Board */}
            <div className="bg-teal-700/50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition">
              <h3 className="text-white font-semibold mb-2">Strategy Board</h3>
              <p className="text-teal-100 text-sm mb-4">
                Track the posted history and plan the next updates.
              </p>
              <div
                className="bg-teal-800/70 h-32 rounded-lg overflow-hidden relative cursor-pointer"
                onClick={() => handleImageClick("dashboard.png")}
              >
                <Image
                  src="/dashboard.png"
                  alt="Strategy Board Preview"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              </div>
            </div>

            {/* Feature 1: Community Wall */}
            <div className="bg-teal-700/50 p-6 rounded-xl shadow-lg transform hover:scale-105 transition">
              <h3 className="text-white font-semibold mb-2">Community Wall</h3>
              <p className="text-teal-100 text-sm mb-4">
                Share your projects with others if you want!
              </p>
              <div
                className="bg-teal-800/70 h-32 rounded-lg overflow-hidden relative cursor-pointer"
                onClick={() => handleImageClick("wall.png")}
              >
                <Image
                  src="/wall.png"
                  alt="Community Wall Preview"
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

      {/* Expanded Image Overlay */}
      {expandedImage && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
          onClick={handleCloseExpanded}
        >
          <div
            className="relative max-w-[90%] max-h-[90%] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <Image
              src={`/${expandedImage}`}
              alt={`${expandedImage.replace(".png", "")} Preview Expanded`}
              width={1200}
              height={800}
              objectFit="contain"
              className="rounded-lg shadow-xl"
            />
            {/* Optional Navigation Arrows */}
            <div
              className="absolute left-0 top-0 h-full w-1/2 flex items-center justify-start opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate("left");
              }}
            >
              <FaArrowLeft className="text-white text-4xl ml-4 drop-shadow-md" />
            </div>
            <div
              className="absolute right-0 top-0 h-full w-1/2 flex items-center justify-end opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleNavigate("right");
              }}
            >
              <FaArrowRight className="text-white text-4xl mr-4 drop-shadow-md" />
            </div>
          </div>
        </div>
      )}

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