"use client";
import GoogleLoginButton from "@/components/common/auth/google-login-button";
import Image from "next/image";
import Script from "next/script";
import React from "react";

const LoaderIcon = () => (
  <svg
    width="30"
    height="30"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    fill="#FAA41B"
  >
    <g transform="translate(50,50)">
      <circle r="7" cx="0" cy="-30" />
      {/* <circle r="8" cx="21.21" cy="-21.21"/> */}
      <circle r="7" cx="30" cy="0" />
      <circle r="7" cx="21.21" cy="21.21" />
      <circle r="7" cx="0" cy="30" />
      <circle r="7" cx="-21.21" cy="21.21" />
      <circle r="7" cx="-30" cy="0" />
      <circle r="7" cx="-21.21" cy="-21.21" />
    </g>
  </svg>
);

const TopSection = () => {
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
          } catch (e) {}
        }}
      />

      {/* Section 1 */}
      <div className="bg-[#000321] relative flex items-center justify-center py-20">
        <div className="absolute top-0 left-0 w-full h-full bg-top-section z-10 object-fill" />
        <div className="relative flex flex-col items-center justify-center z-20 w-[90%] md:w-[80%] gap-5">
          <div className="flex flex-col items-center md:items-start">
            <p className="text-[#FAA41B] text-2xl">Welcome To</p>
            <p className="text-6xl md:text-8xl xl:text-9xl font-[900] text-white mt-3 md:mt-0">
              NextPostAI
            </p>
          </div>
          <p className="text-center text-3xl md:text-5xl xl:text-6xl font-bold text-[#FAA41B]">
            Your AI-Powered Social Media Assistant
          </p>
          {/* <p className='text-lg md:text-2xl text-center text-white font-light'>A task manager so clear and simple, it feels like it reads your mind.</p> */}
          <hr className="my-6 lg:my-10 bg-white w-[50%] lg:w-[40%] h-[1px]" />
          <div className="flex flex-col lg:flex-row justify-center lg:justify-between items-center gap-5">
            <div className="flex flex-col gap-2 lg:gap-8 items-center lg:items-start p-3 lg:p-0">
              <p className="text-white text-2xl lg:text-5xl text-center lg:text-left font-semibold">
                Create Viral Content in Minutes, Not Hours.
              </p>
              <p className="text-white text-sm lg:text-xl text-center lg:text-left font-light tracking-wider">
                Building something amazing but not sure how to market it?
                NextPostAI helps you plan your launch, create engaging content,
                and stay consistent, so your product gets the attention it
                deserves.
              </p>
              <GoogleLoginButton triggerClassName="px-12 py-3 text-primary-foreground bg-primary text-lg w-fit rounded-3xl mt-6 lg:mt-0" />
            </div>
            <Image
              src="/tmpu3cg1514.webp"
              width={600}
              height={600}
              alt="image"
              className="max-w-96"
            />
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <section className="flex flex-col w-full justify-center px-5 md:px-20 lg:px-36 mt-20 gap-5">
        <div className="flex w-full flex-col sm:flex-row gap-5 items-center justify-between">
          <div className="flex flex-col justify-center">
            <p className="text-5xl">Why Choose</p>
            <p className="text-5xl font-medium mt-2">
              <span className="text-[#FAA41B] mr-[2px] font-bold">
                NextPostAI
              </span>
              ?
            </p>
            <hr className="bg-[#FAA41B] w-24 h-[6px] mt-5" />
          </div>
          <Image
            src="/tmp0u5_noks.webp"
            width={500}
            height={500}
            alt="image"
            className="max-w-72 -mt-5"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              title: "Campaign Timeline Designer",
              content:
                "Build marketing journeys with customizable timelines, intensity levels, and platform-specific goals tailored to each project.",
            },
            {
              title: "Context-Aware Post Generator",
              content:
                "Create content that adapts to your campaign's stage, audience type, and platform - no generic prompts, just focused output.",
            },
            {
              title: "Cross-Platform Scheduler",
              content:
                "Automate your posting calendar with intelligent scheduling and adaptive reminders to stay consistently active where it matters.",
            },
            {
              title: "Creator-Led Inspiration Hub",
              content:
                "Browse a living feed of real campaigns from active users, uncover tested strategies, and remix ideas that are driving results today.",
            },
          ].map((data, idx) => (
            <div className="flex flex-row gap-1" key={idx}>
              <p>
                <LoaderIcon />
              </p>
              <div className="flex flex-col gap-2">
                <p className="text-xl font-medium">{data.title}</p>
                <p className="text-sm font-light">{data.content}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 */}
      <section className="flex flex-col w-full justify-center px-5 md:px-20 lg:px-36 mt-24 gap-5">
        <div className="w-full h-full bg-primary rounded-[30px] md:rounded-[80px] px-2 py-10 md:p-16 flex flex-col items-center justify-center gap-16">
          <p className="font-bold text-5xl md:text-5xl text-white">
            How It Works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-5 px-5 md:px-0">
            {[
              {
                title: "Input Your Goals",
                content:
                  "Start with your product, launch stage, or marketing objective.",
                image: "/tmp_jjomf91.webp",
              },
              {
                title: "Generate Campaign Content",
                content:
                  "Let our AI create posts, content ideas, and timelines tailored to your audience.",
                image: "/tmpj30ux4pp.webp",
              },
              {
                title: "Plan & Schedule",
                content:
                  "Organize content with our visual planner - track launch dates, feature drops, and seasonal themes.",
                image: "/tmpq7ttjaop.webp",
              },
              {
                title: "Engage & Grow",
                content:
                  "Put your strategy into action, post with consistency, and watch engagement grow.",
                image: "/tmppzfdqeak.webp",
              },
            ].map((data, idx) => (
              <div
                className="flex flex-col items-center justify-center"
                key={idx}
              >
                <Image
                  src={data.image}
                  width={400}
                  height={400}
                  className="max-w-28 mb-5"
                  alt="image"
                />
                <p className="text-lg font-semibold text-center">
                  {data.title}
                </p>
                <p className="text-sm text-white text-center">{data.content}</p>
              </div>
            ))}
          </div>
          {/* <button className='px-12 py-2 bg-white text-lg w-fit rounded-3xl mt-6 lg:mt-0'>Get Started Now</button> */}
          <GoogleLoginButton triggerClassName="px-12 py-2 bg-white text-black text-lg w-fit rounded-3xl mt-6 lg:mt-0" />
        </div>
      </section>

      <section className="flex flex-col w-full justify-center px-5 md:px-20 lg:px-36 mt-24 gap-10">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-light">
            The <span className="text-[#FAA41B] font-semibold">NextPostAI</span>{" "}
            Advantage
          </h2>
          <hr className="border-t border-gray-600 mt-3 w-24 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-10 text-white place-items-center">
          {/* Traditional Approach */}
          <div>
            <h3 className="text-3xl font-bold mb-2 text-black">
              Traditional Approach
            </h3>
            <div className="w-10 h-1 bg-[#FAA41B] mb-6" />
            <ul className="space-y-3 text-base font-light text-black">
              <li className="flex items-start gap-2">
                <span className="text-red-500">✖</span> Time-consuming trend
                analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">✖</span> Inconsistent posting
                schedule
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">✖</span> Manual content creation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">✖</span> No structure for
                long-term planning
              </li>
            </ul>
          </div>

          {/* With NextPostAI */}
          <div>
            <h3 className="text-3xl font-bold text-black mb-2 ">
              With NextPostAI
            </h3>
            <div className="w-10 h-1 bg-[#FAA41B] mb-6" />
            <ul className="space-y-3 text-base font-light text-black">
              <li className="flex items-start gap-2">
                <span className="text-green-400">✔</span> Smart marketing plans
                built with AI
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✔</span> Instant post & promo
                content generation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✔</span> Supports auto posting
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">✔</span> Access to a supportive
                creator community
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="w-full px-5 md:px-20 lg:px-36 mt-24">
        <div className="bg-[#222639] text-white rounded-t-[80px] rounded-b-[80px] py-16 px-10 md:px-16 flex flex-col items-center gap-12">
          <h2 className="text-4xl md:text-5xl text-primary font-medium text-center text-white">
            Testimonials
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {[
              {
                name: "Alex R",
                role: "Digital Marketer",
                image: "/tmpdj5rdrob.webp",
                quote:
                  "NextPostAI transformed how I market my product. It’s like having a mini CMO in my pocket!",
              },
              {
                name: "Jamie L",
                role: "Small Business Owner",
                image: "/tmp6gymd1vw.webp",
                quote:
                  "I stopped overthinking and just followed the AI’s plan. It works.",
              },
              {
                name: "Morgan K",
                role: "Content Creator",
                image: "/tmph6iuxe9k.webp",
                quote:
                  "The campaign timelines helped me organize my entire product launch.",
              },
            ].map((user, idx) => (
              <div
                key={idx}
                className="bg-white text-black rounded-2xl p-6 flex flex-col gap-4 items-start"
              >
                <Image
                  width={40}
                  height={40}
                  src={user.image}
                  alt={user.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="text-yellow-500 text-lg">★★★★★</div>
                <p className="text-sm font-normal">&quot;{user.quote}&quot;</p>
                <div>
                  <p className="font-bold">{user.name}</p>
                  <p className="text-xs text-gray-500">({user.role})</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-white text-lg mb-4">Ready to get started?</p>
            <GoogleLoginButton triggerClassName="px-12 py-3 text-black bg-[#FAA41B] text-lg w-fit rounded-3xl mt-6 lg:mt-0" />
          </div>
        </div>
      </section>
    </>
  );
};

export { TopSection };
