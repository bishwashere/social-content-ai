import React, { useEffect, useState } from 'react'
import { buttonVariants } from '../ui/button';
import { detectMediaTypeFromUrl } from '@/lib/detect-media-type';

type Props = {
  post: {
    media: string | null;
  };
  showMedia: boolean;
  /** When true, unknown-URL media is shown as image first (e.g. signed URLs); fallback to View Media link on error */
  prioritizeImage?: boolean;
}

const ViewMedia = (props: Props) => {
  const [fileType, setFileType] = useState<"img" | "video" | "unknown">("unknown");
  const [unknownAsImageFailed, setUnknownAsImageFailed] = useState(false);
  const { post, showMedia, prioritizeImage = true } = props;

  useEffect(() => {
    if (post.media) {
      setFileType(detectMediaTypeFromUrl(post.media));
      setUnknownAsImageFailed(false);
    } else {
      setFileType("unknown");
    }
  }, [post.media, props.post.media])

  if (!showMedia) return null;

  if (fileType === "img" && post.media) {
    return (
      <img src={post.media} alt="Uploaded media" className="max-w-md w-full rounded" />
    )
  }

  if (fileType === "video" && post.media) {
    return (
      <video src={post.media} controls className="max-w-md w-full rounded" />
    )
  }

  // Unknown type: prioritize image when requested (e.g. signed URLs without extension)
  if (fileType === "unknown" && post.media) {
    if (prioritizeImage && !unknownAsImageFailed) {
      return (
        <img
          src={post.media}
          alt="Post media"
          className="max-w-md w-full rounded"
          onError={() => setUnknownAsImageFailed(true)}
        />
      );
    }
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