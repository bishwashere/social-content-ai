"use client";

import { useEffect, useState } from 'react';
import { useSession } from '@/backend-apis/auth/hooks';
import { FacebookPageSelector } from './facebook-page-selector';
import Cookies from 'js-cookie';
import { toast } from 'sonner';

type FacebookPage = {
  access_token: string;
  name: string;
  id: string;
};

export function FacebookAuthHandler() {
  const { data: session } = useSession();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    const pagesData = Cookies.get('fb_pages_data');
    if (pagesData) {
      try {
        const parsedPages = JSON.parse(pagesData);
        setPages(parsedPages);
        setShowSelector(true);
        // Remove the cookie after reading
        Cookies.remove('fb_pages_data');
      } catch (error) {
        console.error('Error parsing Facebook pages data:', error);
      }
    }
  }, []);

  const handlePageSelect = async (page: FacebookPage) => {
    try {
      const response = await fetch('/api/auth/facebook-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id,
          pageId: page.id,
          pageAccessToken: page.access_token,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update Facebook page');
      }

      toast.success('Facebook page connected successfully');
      setShowSelector(false);
    } catch (error) {
      console.error('Error updating Facebook page:', error);
      toast.error('Failed to connect Facebook page');
    }
  };

  return (
    <FacebookPageSelector
      pages={pages}
      onPageSelect={handlePageSelect}
      isOpen={showSelector}
    />
  );
}