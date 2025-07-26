import { useQueryAllUploadedMedia, useUploadMedia } from '@/backend-apis/video-generation/hooks'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Project } from '@/db/projects/schema/project'
import React, { useRef } from 'react'

type Props = {
  project: Project
}

const Media = ({ project }: Props) => {
  const vids = useQueryAllUploadedMedia(project._id)
  const upload = useUploadMedia()
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className='flex flex-col gap-4'
    >
      <div className='flex justify-end'>
        <Button
          loading={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          Upload Media
        </Button>
        <input
          onChange={(e) => {
            if (e.target.files) {
              upload.mutate({
                projectId: project._id,
                file: e.target.files[0],
              })
            }
          }}
          type="file" accept='video/*' ref={inputRef} className='hidden' />
      </div>
      <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1 w-full">
        {
          vids?.isLoading ? Array.from({ length: 6 }, (_, i) => (
            <Skeleton className="h-48 w-full" key={i} />
          )) :
            vids?.data?.length === 0 ? (
              <div className="flex items-center justify-center w-full col-span-2">
                <p>No videos uploaded yet.</p>
              </div>) :

              vids?.data?.map((video) => (
                <a
                  href={video.url}
                  target="_blank"
                  key={video.key}
                  className={`relative rounded-lg border h-72 overflow-hidden cursor-pointer transition-all `}
                >
                  <div className="relative">
                    <video
                      src={video.url}
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                      className="object-cover object-center"
                      muted
                    />
                  </div>
                  <div className="p-2 absolute bottom-0 bg-muted left-0 w-full">
                    <h3 className="font-medium text-sm line-clamp-1 truncate">{video.name}</h3>
                  </div>
                </a>
              ))}
      </div>
    </div>
  )
}

export { Media }