import '../home.css'

import { RecentIdeas } from "@/components/recent-ideas";
import { BottomSections } from "./_components/bottom-sections";
import { TopSection } from './_components/top-section';

export default function HomeV3() {

  return (
    <>
      <div className='homepage'>
        <TopSection />
        <RecentIdeas />
        <BottomSections />
      </div>
    </>
  );
}