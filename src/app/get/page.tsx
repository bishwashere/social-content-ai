import '../home.css'

import { RecentBlogs } from "@/components/recent-blogs";
import { BottomSections } from "./_components/bottom-sections";
import { TopSection } from './_components/top-section';

export default function HomeV3() {

  return (
    <>
      <div className='homepage'>
        <TopSection />
        <RecentBlogs />
        <BottomSections />
      </div>
    </>
  );
}