import { ScheduledPost } from "@prisma/client"
import { Dot, Plus } from "lucide-react"
import Markdown from "react-markdown"
import EditableContent from "./editable-content"

type Props = {
  post: ScheduledPost;
  viewContentEdit: string[];
  setViewContentEdit: React.Dispatch<React.SetStateAction<string[]>>
}

const XPostView = ({ post, viewContentEdit, setViewContentEdit }: Props) => {

  const LikeIcon = () => (
    <svg viewBox="0 0 24 24" className="size-5 fill-muted-foreground">
      <g><path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"></path></g>
    </svg>
  )

  const CommentIcon = () => (
    <svg viewBox="0 0 24 24" className="size-4 sm:size-5 fill-muted-foreground">
      <g><path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"></path></g>
    </svg>
  )

  const RepostIcon = () => (
    <svg viewBox="0 0 24 24" className="size-4 sm:size-5 fill-muted-foreground">
      <g><path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"></path></g>
    </svg>
  )

  const InsightsIcon = () => (
    <svg viewBox="0 0 24 24" className="size-4 sm:size-5 fill-muted-foreground">
      <g><path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"></path></g>
    </svg>
  )

  const SaveIcon = () => (
    <svg viewBox="0 0 24 24" className="size-4 sm:size-5 fill-muted-foreground">
      <g><path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z"></path></g>
    </svg>
  )

  const ShareIcon = () => (
    <svg viewBox="0 0 24 24" className="size-4 sm:size-5 fill-muted-foreground">
      <g><path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"></path></g>
    </svg>
  )

  const GrokIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 32" fill="currentColor" className="size-4 fill-muted-foreground">
      <g><path d="M12.745 20.54l10.97-8.19c.539-.4 1.307-.244 1.564.38 1.349 3.288.746 7.241-1.938 9.955-2.683 2.714-6.417 3.31-9.83 1.954l-3.728 1.745c5.347 3.697 11.84 2.782 15.898-1.324 3.219-3.255 4.216-7.692 3.284-11.693l.008.009c-1.351-5.878.332-8.227 3.782-13.031L33 0l-4.54 4.59v-.014L12.743 20.544m-2.263 1.987c-3.837-3.707-3.175-9.446.1-12.755 2.42-2.449 6.388-3.448 9.852-1.979l3.72-1.737c-.67-.49-1.53-1.017-2.515-1.387-4.455-1.854-9.789-.931-13.41 2.728-3.483 3.523-4.579 8.94-2.697 13.561 1.405 3.454-.899 5.898-3.22 8.364C1.49 30.2.666 31.074 0 32l10.478-9.466"></path></g>
    </svg>
  )

  const ThreeDotIcon = () => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="size-4 fill-muted-foreground">
      <g><path d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"></path></g>
    </svg>
  )

  return (
    <div className="bg-white dark:bg-muted shadow-md rounded-lg p-2 sm:p-4 mb-4 max-w-md flex gap-2">
      <img
        src="https://randomuser.me/api/portraits/women/60.jpg" // Replace with the actual avatar URL
        alt="User Avatar"
        className="w-10 h-10 rounded-full"
      />
      <div>
        <div className="flex justify-between mb-1">
          <div className="flex items-center gap-0">
            <h2 className="font-bold dark:text-foreground">Your Name</h2>
            <p className="text-muted-foreground ml-2 text-sm">@PujaJaiswal</p>
            <Dot className="stroke-muted-foreground size-4" />
            <span className="text-muted-foreground text-xs">1d</span>
          </div>
          <div className="flex gap-2 justify-center">
            <GrokIcon />
            <ThreeDotIcon />
          </div>
        </div>
        <div className="w-full">
          <EditableContent media={post.media} id={post.id} content={post.content} viewContentEdit={viewContentEdit} setViewContentEdit={setViewContentEdit} />
        </div>
        <div className="flex w-full justify-between gap-5 mt-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center justify-center gap-1">
              <CommentIcon />
              <p className="text-muted-foreground text-xs sm:text-sm">880</p>

            </div>
            <div className="flex items-center justify-center gap-1">
              <RepostIcon />
              <p className="text-muted-foreground text-xs smtext-sm">3.4K</p>

            </div>
            <div className="flex items-center justify-center gap-1">
              <LikeIcon />
              <p className="text-muted-foreground text-xs smtext-sm">16K</p>

            </div>
            <div className="flex items-center justify-center gap-2">
              <InsightsIcon />
              <p className="text-muted-foreground text-xs smtext-sm">18M</p>
            </div>
          </div>
          <div className="flex gap-1">
            <SaveIcon />
            <ShareIcon />
          </div>
        </div>
      </div>
    </div>
  )
}

export default XPostView;