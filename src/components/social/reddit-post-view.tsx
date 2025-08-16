import { ScheduledPost } from "@prisma/client";
import { Dot } from "lucide-react"
import Image from "next/image";
import EditableContent from "./editable-content";
import { ViewMedia } from "./view-media";

type Props = {
    post: ScheduledPost;
    viewContentEdit: string[];
    setViewContentEdit: React.Dispatch<React.SetStateAction<string[]>>
}

const RedditPostView = ({ post, viewContentEdit, setViewContentEdit }: Props) => {

    const ThreeDotIcon = () => (
        <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
            <g fillRule="evenodd" transform="translate(-446 -350)"><path d="M458 360a2 2 0 1 1-4 0 2 2 0 0 1 4 0m6 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0"></path></g>
        </svg>
    )

    const ShareIcon = () => (
        <svg height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.239 18.723A1.235 1.235 0 0 1 1 17.488C1 11.5 4.821 6.91 10 6.505V3.616a1.646 1.646 0 0 1 2.812-1.16l6.9 6.952a.841.841 0 0 1 0 1.186l-6.9 6.852A1.645 1.645 0 0 1 10 16.284v-2.76c-2.573.243-3.961 1.738-5.547 3.445-.437.47-.881.949-1.356 1.407-.23.223-.538.348-.858.347ZM10.75 7.976c-4.509 0-7.954 3.762-8.228 8.855.285-.292.559-.59.832-.883C5.16 14 7.028 11.99 10.75 11.99h.75v4.294a.132.132 0 0 0 .09.134.136.136 0 0 0 .158-.032L18.186 10l-6.438-6.486a.135.135 0 0 0-.158-.032.134.134 0 0 0-.09.134v4.36h-.75Z"></path>
        </svg>
    )

    const UpvoteIcon = () => (
        <svg height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 19c-.072 0-.145 0-.218-.006A4.1 4.1 0 0 1 6 14.816V11H2.862a1.751 1.751 0 0 1-1.234-2.993L9.41.28a.836.836 0 0 1 1.18 0l7.782 7.727A1.751 1.751 0 0 1 17.139 11H14v3.882a4.134 4.134 0 0 1-.854 2.592A3.99 3.99 0 0 1 10 19Zm0-17.193L2.685 9.071a.251.251 0 0 0 .177.429H7.5v5.316A2.63 2.63 0 0 0 9.864 17.5a2.441 2.441 0 0 0 1.856-.682A2.478 2.478 0 0 0 12.5 15V9.5h4.639a.25.25 0 0 0 .176-.429L10 1.807Z"></path>
        </svg>
    )

    const DownvoteIcon = () => (
        <svg height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 1c.072 0 .145 0 .218.006A4.1 4.1 0 0 1 14 5.184V9h3.138a1.751 1.751 0 0 1 1.234 2.993L10.59 19.72a.836.836 0 0 1-1.18 0l-7.782-7.727A1.751 1.751 0 0 1 2.861 9H6V5.118a4.134 4.134 0 0 1 .854-2.592A3.99 3.99 0 0 1 10 1Zm0 17.193 7.315-7.264a.251.251 0 0 0-.177-.429H12.5V5.184A2.631 2.631 0 0 0 10.136 2.5a2.441 2.441 0 0 0-1.856.682A2.478 2.478 0 0 0 7.5 5v5.5H2.861a.251.251 0 0 0-.176.429L10 18.193Z"></path>
        </svg>
    )

    const CommentIcon = () => (
        <svg height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 19H1.871a.886.886 0 0 1-.798-.52.886.886 0 0 1 .158-.941L3.1 15.771A9 9 0 1 1 10 19Zm-6.549-1.5H10a7.5 7.5 0 1 0-5.323-2.219l.54.545L3.451 17.5Z"></path>
        </svg>
    )

    const AwardIcon = () => (
        <svg height="16" viewBox="0 0 20 20" width="16" xmlns="http://www.w3.org/2000/svg">
            <path d="m18.66 15.36-2.593-3.885A6.997 6.997 0 1 0 3 8c0 1.22.322 2.42.932 3.476l-2.582 3.87a.961.961 0 0 0-.05 1.017c.168.315.525.51.88.483l2.177-.087.741 1.993c.108.333.41.59.756.64a.994.994 0 0 0 .947-.422l2.67-3.997c.35.026.708.026 1.059 0l2.678 4.01a.98.98 0 0 0 .794.418c.388 0 .761-.255.889-.621l.75-2.022 2.155.086a.976.976 0 0 0 .903-.481.955.955 0 0 0-.039-1.003ZM6.143 17.256c-.208-.557-.343-1.488-.871-1.85-.543-.37-1.485-.126-2.092-.101l1.7-2.547a7.009 7.009 0 0 0 2.992 1.909l-1.73 2.589ZM4.5 8a5.5 5.5 0 1 1 5.5 5.5A5.507 5.507 0 0 1 4.5 8Zm10.241 7.393c-.54.354-.675 1.302-.883 1.863l-1.73-2.59a7.007 7.007 0 0 0 2.992-1.908l1.7 2.547c-.601-.024-1.537-.268-2.079.088Z"></path>
        </svg>
    )

    return (
        <div className="bg-white shadow-md rounded-lg p-4 mb-4 max-w-md">
            <div className="flex justify-between">
                <div className="flex items-center">
                    <img
                        src="https://randomuser.me/api/portraits/women/60.jpg" // Replace with the actual avatar URL
                        alt="User Avatar"
                        className="size-7 rounded-full mr-1"
                    />
                    <div className="flex items-center gap-0">
                        <h2 className="font-medium text-sm text-muted-foreground">r/username</h2>
                        <Dot className="stroke-muted-foreground size-3" />
                        <p className="text-muted-foreground text-xs">18 hr. ago</p>
                    </div>
                </div>
                <div className="flex gap-3 items-center justify-center">
                    <button className="bg-blue-500 text-white text-xs rounded-2xl px-2 py-1">Join</button>
                    <ThreeDotIcon />
                </div>
            </div>


            <div className="w-full space-y-3 mt-2">
                <EditableContent id={post.id} media={post.media} content={post.content} viewContentEdit={viewContentEdit} setViewContentEdit={setViewContentEdit} />

                <ViewMedia post={post} showMedia={!viewContentEdit.includes(post.id)} />
            </div>

            <div className="flex w-full gap-4 mt-3">
                <div className="flex items-center justify-center gap-2 bg-muted-foreground/15 px-3 py-1 rounded-3xl">
                    <UpvoteIcon />
                    <p className="font-medium text-gray-700 text-sm">438</p>
                    <DownvoteIcon />
                </div>
                <div className="flex items-center justify-center gap-1 bg-muted-foreground/15 px-3 py-1 rounded-3xl">
                    <CommentIcon />
                    <p className="font-medium text-gray-700 text-sm">100</p>
                </div>
                <div className="flex items-center justify-center gap-1 bg-muted-foreground/15 px-3 py-1 rounded-3xl">
                    <AwardIcon />
                </div>
                <div className="flex items-center justify-center gap-1 bg-muted-foreground/15 px-3 py-1 rounded-3xl">
                    <ShareIcon />
                    <p className="font-medium text-gray-700 text-sm">Share</p>
                </div>
            </div>
        </div>
    )
}

export default RedditPostView;