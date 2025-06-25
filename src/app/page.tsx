"use client"
// Dynamic import for non-critical components
import dynamic from 'next/dynamic';
const GoogleLoginButton = dynamic(() => import('@/components/common/google-login-button'), { ssr: false });
import './home.css'

import Image from "next/image";

const LoaderIcon = () => (
  <svg width="30" height="30" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="#FAA41B">
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
)

export default function HomeV3() {

  return (
    <div className='homepage pb-10'>

      {/* Section 1 */}
      <div className='bg-[#000321] relative flex items-center justify-center py-20'>
        <div className='absolute top-0 left-0 w-full h-full bg-top-section z-10 object-fill' />
        <div className='relative flex flex-col items-center justify-center z-20 w-[90%] md:w-[80%] gap-5'>
          <div className='flex flex-col items-center md:items-start'>
            <p className='text-[#FAA41B] text-2xl'>Welcome To</p>
            <p className='text-6xl md:text-8xl xl:text-9xl font-[900] text-white mt-3 md:mt-0'>NextPostAI</p>
          </div>
          <p className='text-center text-3xl md:text-5xl xl:text-6xl font-bold text-[#FAA41B]'>Your AI-Powered Social Media Assistant</p>
          {/* <p className='text-lg md:text-2xl text-center text-white font-light'>A task manager so clear and simple, it feels like it reads your mind.</p> */}
          <hr className='my-6 lg:my-10 bg-white w-[50%] lg:w-[40%] h-[1px]' />
          <div className='flex flex-col lg:flex-row justify-center lg:justify-between items-center gap-5'>
            <div className='flex flex-col gap-2 lg:gap-8 items-center lg:items-start p-3 lg:p-0'>
              <p className='text-white text-2xl lg:text-5xl text-center lg:text-left font-semibold'>Create Viral Content in Minutes, Not Hours</p>
              <p className='text-white text-sm lg:text-xl text-center lg:text-left font-light tracking-wider'>Struggling to keep up with the ever-changing social media landscape? NextPostAI simplifies your content creation process, helping you generate engaging posts effortlessly.</p>
              {/* <button className='px-12 py-3 bg-[#FAA41B] text-lg w-fit rounded-3xl mt-6 lg:mt-0'>Get Started Now</button> */}
              <GoogleLoginButton triggerClassName='px-12 py-3 text-black bg-[#FAA41B] text-lg w-fit rounded-3xl mt-6 lg:mt-0' />
            </div>
            <Image src="/tmpu3cg1514.webp" width={600} height={600} alt="image" className='max-w-96' />
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <section className='flex flex-col w-full justify-center px-5 md:px-20 lg:px-36 mt-20 gap-5'>
        <div className='flex w-full flex-col sm:flex-row gap-5 items-center justify-between'>
          <div className='flex flex-col justify-center'>
            <p className='text-5xl'>Why Choose</p>
            <p className='text-5xl font-medium mt-2'><span className='text-[#FAA41B] mr-[2px] font-bold'>NextPostAI</span>?</p>
            <hr className='bg-[#FAA41B] w-24 h-[6px] mt-5' />
          </div>
          <Image src="/tmp0u5_noks.webp" width={500} height={500} alt="image" className='max-w-72 -mt-5' />
        </div>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-5'>
          {
            [
              {
                title: "Smart Content Planner",
                content: "Schedule your posts and receive timely reminders to maintain a consistent online presence."
              },
              {
                title: "AI-Driven Viral Content Generator",
                content: "Leverage our advanced AI to craft posts that resonate with your audience and have the potential to go viral."
              },
              {
                title: "Community Inspiration",
                content: "Explore a diverse range of content from fellow creators to spark new ideas and share your own."
              }
            ].map((data, idx) => (
              <div className='flex flex-row gap-1' key={idx}>
                <p><LoaderIcon /></p>
                <div className='flex flex-col gap-2'>
                  <p className='text-xl font-medium'>{data.title}</p>
                  <p className='text-sm font-light'>{data.content}</p>
                </div>
              </div>
            ))
          }
        </div>
      </section>

      {/* Section 3 */}
      <section className='flex flex-col w-full justify-center px-5 md:px-20 lg:px-36 mt-24 gap-5'>
        <div className='w-full h-full bg-[#FAA41B] rounded-[30px] md:rounded-[80px] px-2 py-10 md:p-16 flex flex-col items-center justify-center gap-16'>
          <p className='font-bold text-5xl md:text-5xl'>How It Works</p>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-5 px-5 md:px-0'>
            {
              [
                {
                  title: "Input Your Ideas",
                  content: "Input Your Ideas",
                  image: "/tmp_jjomf91.webp"
                },
                {
                  title: "Generate Content",
                  content: "Let our AI create compelling posts tailored to your audience.",
                  image: "/tmpj30ux4pp.webp"
                },
                {
                  title: "Plan & Schedule",
                  content: "Use the content planner to organize and schedule your posts.",
                  image: "/tmpq7ttjaop.webp"
                },
                {
                  title: "Engage & Grow",
                  content: "Share your content and watch your engagement soar.",
                  image: "/tmppzfdqeak.webp"
                },
              ].map((data, idx) => (
                <div className='flex flex-col items-center justify-center' key={idx}>
                  <Image src={data.image} width={400} height={400} className='max-w-28 mb-5' alt="image" />
                  <p className='text-lg font-semibold text-center'>{data.title}</p>
                  <p className='text-sm text-white text-center'>{data.content}</p>
                </div>
              ))
            }
          </div>
          {/* <button className='px-12 py-2 bg-white text-lg w-fit rounded-3xl mt-6 lg:mt-0'>Get Started Now</button> */}
          <GoogleLoginButton triggerClassName='px-12 py-2 bg-white text-black text-lg w-fit rounded-3xl mt-6 lg:mt-0' />
        </div>
      </section>
    </div>
  )

  // return (
  //   <div className="bg-gradient-to-t from-teal-600 to-cyan-500 min-h-screen flex flex-col justify-between">
  //     <div className="container mx-auto px-4 py-8">
  //       {/* Hero Section */}
  //       <header className="text-center mb-12">
  //         <h1 className="text-5xl text-white mb-4 drop-shadow-md">
  //           NextPostAI
  //         </h1>
  //         <p className="text-xl text-teal-100 max-w-lg mx-auto">
  //           Generate ready-to-post Content for Facebook, LinkedIn, X, and Instagram.
  //         </p>
  //       </header>

  //       {/* Static Features Section */}
  //       <div className="max-w-6xl mx-auto mb-12">
  //         {/* Call-to-Action */}
  //         <div className="flex justify-center mb-8">
  //           <GoogleLoginButton triggerClassName="min-w-32" />
  //         </div>

  //         {/* Single Box for Features */}
  //         <div className="p-6 rounded-2xl bg-teal-700/30 border border-teal-500">
  //           <h2 className="text-2xl font-semibold text-white mb-6 text-center">
  //             Features
  //           </h2>
  //           <div className="grid md:grid-cols-3 gap-6">
  //             {/* Feature 1: Content Generator */}
  //             <div className="text-center">
  //               <h3 className="text-white font-semibold mb-2">
  //                 1. Viral Content Generator
  //               </h3>
  //               <p className="text-teal-100 text-sm mb-4">
  //                 AI that is tuned to generate viral content.
  //               </p>
  //             </div>

  //             {/* Feature 2: Content Planner */}
  //             <div className="text-center">
  //               <h3 className="text-white font-semibold mb-2">2. Content Planner</h3>
  //               <p className="text-teal-100 text-sm mb-4">
  //                 Enter when you make posts, and get auto alert to post next time.
  //               </p>
  //             </div>

  //             {/* Feature 3: Community Wall */}
  //             <div className="text-center">
  //               <h3 className="text-white font-semibold mb-2">3. Get Ideas</h3>
  //               <p className="text-teal-100 text-sm mb-4">
  //                 Get inspiring ideas from other peoples projects + content. Or share yours.
  //               </p>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       {/* Community Wall Preview Section */}
  //       <div className="max-w-4xl mx-auto mb-12">
  //         <h2 className="text-2xl font-semibold text-white mb-6 text-center">
  //           ✨ Work with AI or generate your own content  ✨
  //         </h2>
  //         <div className="w-full">
  //           <Image
  //             src="/generator.png"
  //             alt="Community Wall Full Preview"
  //             width={1024}
  //             height={576}
  //             className="w-full h-auto"
  //             loading="lazy"
  //           />
  //         </div>
  //       </div>

  //       {/* Community Wall Preview Section */}
  //       <div className="max-w-4xl mx-auto mb-12">
  //         <h2 className="text-2xl font-semibold text-white mb-6 text-center">
  //           ✨ Get inspired by what others are sharing on NextPostAI ✨
  //         </h2>
  //         <div className="w-full">
  //           <Image
  //             src="/wall-preview.png"
  //             alt="Community Wall Full Preview"
  //             width={1024}
  //             height={576}
  //             className="w-full h-auto"
  //             loading="lazy"
  //           />
  //         </div>
  //       </div>

  //       {/* Strategy Board Preview Section */}
  //       <div className="max-w-4xl mx-auto mb-12">
  //         <h2 className="text-2xl font-semibold text-white mb-6 text-center">
  //           📆 Content Planner 📆
  //         </h2>
  //         <div className="w-full">
  //           <Image
  //             src="/dashboard-preview.png"
  //             alt="Strategy Board Full Preview"
  //             width={1024}
  //             height={576}
  //             className="w-full h-auto"
  //             loading="lazy"
  //           />
  //         </div>
  //       </div>

  //       {/* old way - new way */}
  //       <div className="w-full max-w-[450px] mx-auto mb-12">
  //         <h3 className="text-white font-semibold mb-4 text-center text-2xl">Why use NextPostAI?</h3>
  //         {/* Old Way in a Box */}
  //         <div className="p-6 rounded-xl bg-teal-700/50 border border-teal-500 mb-8 mx-auto">
  //           <h3 className="text-white font-semibold mb-4 text-left text-xl">Old Way</h3>
  //           <ul className="text-teal-100 text-lg text-left">
  //             <li><span className="text-red-500">❌</span> 5-10 hours analyzing trends</li>
  //             <li><span className="text-red-500">❌</span> Inconsistent posting</li>
  //             <li><span className="text-red-500">❌</span> Manual content creation</li>
  //             <li><span className="text-red-500">❌</span> AI hallucinates</li>
  //           </ul>
  //         </div>

  //         {/* New Way in a Box */}
  //         <div className="p-6 rounded-xl bg-teal-700/50 border border-teal-500 mx-auto">
  //           <h3 className="text-white font-semibold mb-4 text-left text-xl">New Way with NextPostAI</h3>
  //           <ul className="text-teal-100 text-lg text-left">
  //             <li><span className="text-green-500">✔️</span> Instant viral AI-generated content</li>
  //             <li><span className="text-green-500">✔️</span> Automated reminders</li>
  //             <li><span className="text-green-500">✔️</span> Community inspiration</li>
  //             <li><span className="text-green-500">✔️</span> Effortless posting schedule</li>
  //           </ul>
  //         </div>
  //       </div>







  //       {/* Call-to-Action */}
  //       <div className="flex justify-center mb-8">
  //         <GoogleLoginButton triggerClassName="min-w-32" />
  //       </div>
  //     </div>

  //     {/* Footer */}
  //     <div className="bg-teal-800/50 py-6 text-center">
  //       <p className="text-teal-200 text-sm">
  //         © 2025 NextPostAI. All rights reserved.
  //       </p>
  //     </div>

  //     {/* Inline Styles for Animation */}
  //     <style>{`
  //       @keyframes fadeIn {
  //         from { opacity: 0; }
  //         to { opacity: 1; }
  //       }
  //       .animate-fade-in {
  //         animation: fadeIn 0.3s ease-out forwards;
  //       }
  //     `}</style>
  //   </div>
  // );
}