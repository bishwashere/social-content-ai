"use client";
import GoogleLoginButton from "@/components/common/auth/google-login-button";
import Image from "next/image";
import React, { useState } from "react";

const BottomSections = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "Is NextPostAI suitable for all social media platforms?",
      answer: "Yes, it supports Facebook, LinkedIn, X, and Instagram.",
    },
    {
      question: "Can I customize the AI-generated content?",
      answer:
        "Absolutely! You can edit and tailor the content to fit your brand voice",
    },
    {
      question: "Is there a free trial available?",
      answer:
        "A: Yes, we offer a free trial so you can experience the benefits firsthand.",
    },
  ];
  return (
    <>
      <section className="w-full px-5 md:px-20 lg:px-36 mt-24">
        {/* Mobile-Friendly Design */}
        <div className="flex flex-col md:flex-row items-center justify-around gap-10 mb-16">
          <Image
            width={200}
            height={200}
            src="/mobile-icon.webp"
            alt="Mobile Design"
            className="w-40 md:w-60"
          />
          <div className="flex flex-col max-w-xl">
            <h3 className="text-3xl md:text-5xl font-bold text-[#0F1124]">
              Mobile-Friendly <br />
              <span className="text-[#FAA41B]">Design</span>
            </h3>
            <div className="w-10 h-1 bg-[#FAA41B] my-4" />
            <p className="text-sm md:text-lg text-[#0F1124]">
              Access NextPostAI on any device. Whether you&apos;re on the go or
              at your desk, your marketing tools are always within reach.
            </p>
          </div>
        </div>

        <hr className="border-t border-gray-300 mb-16" />

        {/* Privacy & Security */}
        <div className="flex flex-col md:flex-row items-center justify-around gap-10">
          <div className="flex flex-col max-w-xl order-2 md:order-1">
            <h3 className="text-3xl md:text-5xl font-bold text-[#FAA41B]">
              Privacy <span className="text-[#0F1124]">& Security</span>
            </h3>
            <div className="w-10 h-1 bg-[#FAA41B] my-4" />
            <ul className="list-disc pl-5 space-y-2 text-[#0F1124] text-sm md:text-lg">
              <li>100% free to start - no credit card required</li>
              <li>Upgrade later for pro features</li>
              <li>Stay with the free version if that’s all you need</li>
              <li>30-second signup, full productivity support</li>
            </ul>
          </div>
          <Image
            width={200}
            height={200}
            src="/privacy-icon.webp"
            alt="Privacy"
            className="w-40 md:w-60 order-1 md:order-2"
          />
        </div>
      </section>

      <section className="w-full mt-24 md:mt-48 px-4 md:px-8 lg:px-20 flex flex-col items-center">
        {/* Who Can Benefit */}
        <div className="bg-[#FAA41B] text-white pt-24 skew-y-[-5deg] w-full relative pb-56">
          <div
            className="absolute left-0 -top-16 md:-top-[87px] inset-0 bg-[#222639] h-14 w-56 md:h-20 md:w-96"
            style={{
              clipPath: "polygon(0 0, 21% 64%, 100% 100%, 0% 100%)",
            }}
          />
          <div
            className="absolute right-0 -bottom-8 bg-[#222639] h-7 w-24"
            style={{
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 100% 100%)",
            }}
          />
          <div className="skew-y-[5deg] max-w-3xl mx-auto flex flex-col items-center pt-5">
            <h2 className="text-3xl md:text-5xl font-light mb-6">
              Who Can Benefit?
            </h2>
            <ul className="text-left space-y-4 text-base md:text-lg font-light px-5">
              <li>
                <span className="mr-2">🟡</span>
                <span className="font-semibold">Entrepreneurs:</span> Launch
                with confidence using AI-backed strategies
              </li>
              <li>
                <span className="mr-2">🟡</span>
                <span className="font-semibold">Marketers:</span> Plan
                campaigns, not just posts
              </li>
              <li>
                <span className="mr-2">🟡</span>
                <span className="font-semibold">Influencers:</span> Promote
                offers, collabs, or content drops
              </li>
              <li>
                <span className="mr-2">🟡</span>
                <span className="font-semibold">Small Businesses:</span> Build
                brand presence with structured promotion
              </li>
            </ul>
          </div>
        </div>

        {/* Get Started Today */}
        <div className="bg-[#222639] text-white w-full md:w-[70%] px-5 md:px-20 lg:px-36 py-20 rounded-[60px] text-center -mt-36 z-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-10">
            Get Started Today
          </h2>
          <p className="text-sm md:text-base font-light max-w-xl mx-auto mb-10">
            Experience the power of having a smart marketing assistant by your
            side. <br />
            Sign up now and simplify your promotional strategy.
          </p>
          <GoogleLoginButton triggerClassName="px-12 py-3 text-black bg-[#FAA41B] text-lg w-fit rounded-3xl mt-6 lg:mt-0" />
        </div>
      </section>

      <section className="w-full px-5 md:px-20 lg:px-36 mt-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl text-[#0F1124] font-light">
            Frequently
          </h2>
          <h3 className="text-3xl md:text-5xl font-bold text-[#FAA41B]">
            Asked Questions
          </h3>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border rounded-md overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full bg-[#222639] text-white px-6 py-4 text-left font-semibold flex justify-between items-center"
              >
                <span>
                  Question {idx + 1}: {faq.question}
                </span>
                <span className="text-lg">{openIndex === idx ? "▴" : "▾"}</span>
              </button>
              {openIndex === idx && (
                <div className="bg-white text-[#222639] px-6 py-4 text-sm">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="w-full mt-20 flex items-center justify-center px-5 md:px-20 lg:px-36">
        <div
          className="relative rounded-[30px] overflow-hidden text-white text-center w-full px-6 py-10 md:py-16 md:px-16"
          style={{
            backgroundImage: "url('/tmp9wo0ngod.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-10">
            <p className="text-xl md:text-2xl">
              Ready to revolutionize your product marketing?
            </p>
            <h2 className="text-3xl md:text-5xl font-semibold">
              Join the{" "}
              <span className="font-bold text-[#0F1124] bg-white px-1 rounded">
                NextPostAI
              </span>{" "}
              community today.
            </h2>
            <GoogleLoginButton triggerClassName="bg-white text-[#0F1124] font-semibold px-6 py-3 rounded-full shadow-md hover:scale-105 transition-all" />
          </div>
        </div>
      </section>

      <footer className="w-full bg-[#0F1124] text-white -mt-40 px-5 md:px-20 lg:px-36 pt-52 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
          {/* Left - Stay Up to Date Form */}
          <div>
            <p className="uppercase text-sm mb-4 tracking-widest">
              Stay Up To Date
            </p>
            <form className="flex flex-col gap-4 max-w-sm">
              <div>
                <label htmlFor="email" className="text-sm font-medium">
                  Email *
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Email"
                  className="mt-1 w-full px-4 py-2 rounded border border-gray-300 text-black focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-all"
              >
                SUBMIT
              </button>
            </form>
          </div>

          {/* Right - Contact Info */}
          <div>
            <p className="uppercase text-sm mb-4 tracking-widest">
              Stay In Touch
            </p>
            <ul className="space-y-2 text-sm">
              <li>📧 bishwas@unclesamstech.com</li>
              <li>📞 +1 (223) 279-9248</li>
              <li>📍Mechanicsburg, PA, USA</li>
            </ul>
          </div>
        </div>

        <hr className="border-gray-600 mb-6" />

        <div className="flex flex-col md:flex-row justify-between text-xs text-gray-400 gap-4">
          <div className="flex gap-6">
            <a href="/ideas" className="hover:underline">
              Ideas
            </a>
            <a href="/privacy" className="hover:underline">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:underline">
              Terms & Conditions
            </a>
          </div>
          <div className="text-center md:text-left">
            Copyright © 2026. All rights reserved. NextPostAI
          </div>
          <div className="flex gap-4 justify-center md:justify-end">
            <a href="#">
              <i className="fab fa-facebook-f" />
            </a>
            <a href="#">
              <i className="fab fa-instagram" />
            </a>
            <a href="#">
              <i className="fab fa-youtube" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
};

export { BottomSections };
