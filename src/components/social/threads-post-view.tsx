import { ScheduledPost } from "@prisma/client"
import { Dot, Plus } from "lucide-react"
import Markdown from "react-markdown"
import EditableContent from "./editable-content"
import { ViewMedia } from "./view-media"

type Props = {
  post: ScheduledPost;
  viewContentEdit: string[];
  setViewContentEdit: React.Dispatch<React.SetStateAction<string[]>>
}

const ThreadsPostView = ({ post, viewContentEdit, setViewContentEdit }: Props) => {

  const LikeIcon = () => (
    <svg viewBox="0 0 24 24" className="size-5 fill-muted-foreground">
      <g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g>
    </svg>
  )

  const CommentIcon = () => (
    <svg viewBox="0 0 18 18" className="size-[18px] stroke-muted-foreground fill-white">
      <path d="M15.376 13.2177L16.2861 16.7955L12.7106 15.8848C12.6781 15.8848 12.6131 15.8848 12.5806 15.8848C11.3779 16.5678 9.94767 16.8931 8.41995 16.7955C4.94194 16.5353 2.08152 13.7381 1.72397 10.2578C1.2689 5.63919 5.13697 1.76863 9.75264 2.22399C13.2307 2.58177 16.0261 5.41151 16.2861 8.92429C16.4161 10.453 16.0586 11.8841 15.376 13.0876C15.376 13.1526 15.376 13.1852 15.376 13.2177Z" strokeLinejoin="round" strokeWidth="1.25"></path>
    </svg>
  )

  const RepostIcon = () => (
    <svg viewBox="0 0 24 24" className="size-4 sm:size-5 fill-muted-foreground">
      <g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g>
    </svg>
  )

  const ShareIcon = () => (
    <svg viewBox="0 0 18 18" className="size-4 sm:size-5 fill-none stroke-muted-foreground">
      <path d="M15.6097 4.09082L6.65039 9.11104" strokeLinejoin="round" strokeWidth="1.25"></path>
      <path d="M7.79128 14.439C8.00463 15.3275 8.11131 15.7718 8.33426 15.932C8.52764 16.071 8.77617 16.1081 9.00173 16.0318C9.26179 15.9438 9.49373 15.5501 9.95761 14.7628L15.5444 5.2809C15.8883 4.69727 16.0603 4.40546 16.0365 4.16566C16.0159 3.95653 15.9071 3.76612 15.7374 3.64215C15.5428 3.5 15.2041 3.5 14.5267 3.5H3.71404C2.81451 3.5 2.36474 3.5 2.15744 3.67754C1.97758 3.83158 1.88253 4.06254 1.90186 4.29856C1.92415 4.57059 2.24363 4.88716 2.88259 5.52032L6.11593 8.7243C6.26394 8.87097 6.33795 8.94431 6.39784 9.02755C6.451 9.10144 6.4958 9.18101 6.53142 9.26479C6.57153 9.35916 6.59586 9.46047 6.64451 9.66309L7.79128 14.439Z" strokeLinejoin="round" strokeWidth="1.25"></path>
    </svg>
  )

  const ThreeDotIcon = () => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-4 fill-muted-foreground">
      <g><path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></g>
    </svg>
  )

  return (
    <div className="bg-white shadow-md rounded-lg p-2 sm:p-4 mb-4 max-w-md flex gap-2">
      <img
        src="https://randomuser.me/api/portraits/women/60.jpg" // Replace with the actual avatar URL
        alt="User Avatar"
        className="w-10 h-10 rounded-full"
      />
      <div>
        <div className="flex justify-between mb-1">
          <div className="flex items-center gap-0">
            <p className="text-base font-semibold font-sans opacity-80">username</p>
            <span className="text-gray-400 text-sm font-sans ml-1.5">1h</span>
          </div>
          <div className="flex gap-2 justify-center">
            <ThreeDotIcon />
          </div>
        </div>
        <div className="mb-3 space-y-3 w-full">
          <EditableContent id={post.id} media={post.media} content={post.content} viewContentEdit={viewContentEdit} setViewContentEdit={setViewContentEdit} />

          <ViewMedia post={post} showMedia={!viewContentEdit.includes(post.id)} />
        </div>
        <div className="flex w-full gap-5 mt-3 font-sans">
          <div className="flex items-center justify-center gap-1">
            <LikeIcon />
            <p className="text-muted-foreground text-xs smtext-sm">16K</p>
          </div>
          <div className="flex items-center justify-center gap-1">
            <CommentIcon />
            <p className="text-muted-foreground text-xs sm:text-sm">880</p>
          </div>
          <div className="flex items-center justify-center gap-1">
            <RepostIcon />
            <p className="text-muted-foreground text-xs smtext-sm">3.4K</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <ShareIcon />
            <p className="text-muted-foreground text-xs smtext-sm">1.2K</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThreadsPostView;