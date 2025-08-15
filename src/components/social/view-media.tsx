import React, { useEffect, useState } from 'react'
import { buttonVariants } from '../ui/button';
import { detectMediaTypeFromUrl } from '@/lib/detect-media-type';

type Props = {
  post: {
    media: string | null;
  };
  showMedia: boolean;
}

const ViewMedia = (props: Props) => {
  const [fileType, setFileType] = useState<"img" | "video" | "unknown">("unknown");
  const { post, showMedia } = props;

  useEffect(() => {
    if (post.media) {
      setFileType(detectMediaTypeFromUrl(post.media))
    } else {
      setFileType("unknown")
    }
  }, [post.media, props.post.media])

  if (!showMedia) return null;

  if (fileType === "img" && post.media) {
    return (
      <img src={post.media} alt="Uploaded media" className="max-w-sm rounded" />
    )
  }

  if (fileType === "video" && post.media) {
    return (
      <video src={post.media} controls className="max-w-sm rounded" />
    )
  }

  if (fileType === "unknown" && post.media) {
    return (
      <div className='flex items-center justify-center'>
        <a className={buttonVariants({ variant: "outline" })} href={post.media} target="_blank">
          View Media
        </a>
      </div>
    )
  }
}

export { ViewMedia }