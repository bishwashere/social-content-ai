import { ScheduledPost } from "@prisma/client";
import { Dot } from "lucide-react"
import Image from "next/image";
import Markdown from "react-markdown"
import EditableContent from "./editable-content";

const FacebookPostView = ({ post }: { post: ScheduledPost }) => {

    const ThreeDotIcon = () => (
        <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
            <g fillRule="evenodd" transform="translate(-446 -350)"><path d="M458 360a2 2 0 1 1-4 0 2 2 0 0 1 4 0m6 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0m-12 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0"></path></g>
        </svg>
    )

    const GlobeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" focusable="false" className="size-3">
            <path d="M8 1a7 7 0 107 7 7 7 0 00-7-7zM3 8a5 5 0 011-3l.55.55A1.5 1.5 0 015 6.62v1.07a.75.75 0 00.22.53l.56.56a.75.75 0 00.53.22H7v.69a.75.75 0 00.22.53l.56.56a.75.75 0 01.22.53V13a5 5 0 01-5-5zm6.24 4.83l2-2.46a.75.75 0 00.09-.8l-.58-1.16A.76.76 0 0010 8H7v-.19a.51.51 0 01.28-.45l.38-.19a.74.74 0 01.68 0L9 7.5l.38-.7a1 1 0 00.12-.48v-.85a.78.78 0 01.21-.53l1.07-1.09a5 5 0 01-1.54 9z"></path>
        </svg>
    )

    const XIcon = () => (
        <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor">
            <path d="M15.543 3.043a1 1 0 1 1 1.414 1.414L11.414 10l5.543 5.542a1 1 0 0 1-1.414 1.415L10 11.414l-5.543 5.543a1 1 0 0 1-1.414-1.415L8.586 10 3.043 4.457a1 1 0 1 1 1.414-1.414L10 8.586l5.543-5.543z"></path>
        </svg>
    )

    return (
        <div className="bg-white shadow-md rounded-lg p-4 mb-4 max-w-md">
            <div className="flex justify-between">
                <div className="flex items-center mb-2">
                    <img
                        src="https://randomuser.me/api/portraits/women/60.jpg" // Replace with the actual avatar URL
                        alt="User Avatar"
                        className="w-12 h-12 rounded-full mr-3"
                    />
                    <div className="flex flex-col gap-0">
                        <div className="flex items-center">
                            <h2 className="font-bold">Your Name</h2>
                            <Dot className="stroke-muted-foreground size-3" />
                            <p className="font-medium text-sm text-blue-700">Follow</p>

                        </div>
                        <div className="flex items-center">
                            <span className="text-muted-foreground font-medium text-xs">{new Date(post.date).toLocaleString("en-US", {
                                month: "long",        // "August"
                                day: "numeric",       // 5
                                hour: "numeric",      // 5
                                minute: "2-digit",    // 30
                                hour12: true,         // PM format
                            })}</span>
                            <Dot className="stroke-muted-foreground size-3" />
                            <GlobeIcon />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 justify-center">
                    <ThreeDotIcon />
                    <XIcon />
                </div>
            </div>


            <div className="w-full">
                <EditableContent id={post.id} content={post.content} />
            </div>
            <div className="w-full mt-3 flex gap-1 items-center">
                <img src="/facebook-reactions.png" className="w-9 h-auto" />
                <p className="text-sm text-muted-foreground">534</p>
            </div>
            <hr className="w-full my-3" />
            <div className="flex w-full justify-around">
                <div className="flex items-center justify-center gap-2">
                    <Image src="/facebook-like.png" width={18} height={18} alt="Like" />
                    <p className="font-medium text-muted-foreground text-sm">Like</p>

                </div>
                <div className="flex items-center justify-center gap-2">
                    <Image src="/facebook-comment.png" width={18} height={18} alt="Like" />
                    <p className="font-medium text-muted-foreground text-sm">Comment</p>

                </div>
                <div className="flex items-center justify-center gap-2">
                    <Image src="/facebook-share.png" width={18} height={18} alt="Like" />
                    <p className="font-medium text-muted-foreground text-sm">Repost</p>

                </div>
            </div>
        </div>
    )
}

export default FacebookPostView;