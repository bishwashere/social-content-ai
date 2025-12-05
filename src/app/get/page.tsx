import '../home.css'

import { RecentIdeas } from "@/components/recent-ideas";
import { BottomSections } from "./_components/bottom-sections";
import { TopSection } from './_components/top-section';

// Force dynamic rendering to always fetch fresh data for recent ideas
export const dynamic = 'force-dynamic'
export const revalidate = 0

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