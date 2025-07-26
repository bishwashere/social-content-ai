import React from 'react';
import VideoSelectionPage from './_components';

const Page = () => {
  return (
    <main
      className="
        transition-all duration-300 px-4 py-6 space-y-6 -mt-[4.5rem]
        ml-0
        md:ml-[16rem]
        data-[sidebar=collapsed]:md:ml-[4rem]
      "
    >
      <VideoSelectionPage />
    </main>
  );
};

export default Page;
