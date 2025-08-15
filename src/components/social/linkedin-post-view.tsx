import { OauthProvider, ScheduledPost } from "@prisma/client"
import { Dot, Plus } from "lucide-react"
import Markdown from "react-markdown"
import EditableContent from "./editable-content"

type Props = {
    post: ScheduledPost & { oauthProvider: OauthProvider };
    viewContentEdit: string[];
    setViewContentEdit: React.Dispatch<React.SetStateAction<string[]>>
}

const LinkedinPostView = ({ post, viewContentEdit, setViewContentEdit }: Props) => {

    const LikeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
            <path d="M12.91 7l-2.25-2.57a8.21 8.21 0 01-1.5-2.55L9 1.37A2.08 2.08 0 007 0a2.08 2.08 0 00-2.06 2.08v1.17a5.81 5.81 0 00.31 1.89l.28.86H2.38A1.47 1.47 0 001 7.47a1.45 1.45 0 00.64 1.21 1.48 1.48 0 00-.37 2.06 1.54 1.54 0 00.62.51h.05a1.6 1.6 0 00-.19.71A1.47 1.47 0 003 13.42v.1A1.46 1.46 0 004.4 15h4.83a5.61 5.61 0 002.48-.58l1-.42H14V7zM12 12.11l-1.19.52a3.59 3.59 0 01-1.58.37H5.1a.55.55 0 01-.53-.4l-.14-.48-.49-.21a.56.56 0 01-.34-.6l.09-.56-.42-.42a.56.56 0 01-.09-.68L3.55 9l-.4-.61A.28.28 0 013.3 8h5L7.14 4.51a4.15 4.15 0 01-.2-1.26V2.08A.09.09 0 017 2a.11.11 0 01.08 0l.18.51a10 10 0 001.9 3.24l2.84 3z"></path>
        </svg>
    )

    const CommentIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
            <path d="M5 8h5v1H5zm11-.5v.08a6 6 0 01-2.75 5L8 16v-3H5.5A5.51 5.51 0 010 7.5 5.62 5.62 0 015.74 2h4.76A5.5 5.5 0 0116 7.5zm-2 0A3.5 3.5 0 0010.5 4H5.74A3.62 3.62 0 002 7.5 3.53 3.53 0 005.5 11H10v1.33l2.17-1.39A4 4 0 0014 7.58zM5 7h6V6H5z"></path>
        </svg>
    )

    const RepostIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
            <path d="M4 10H2V5c0-1.66 1.34-3 3-3h3.85L7.42 0h2.44L12 3 9.86 6H7.42l1.43-2H5c-.55 0-1 .45-1 1v5zm8-4v5c0 .55-.45 1-1 1H7.15l1.43-2H6.14L4 13l2.14 3h2.44l-1.43-2H11c1.66 0 3-1.34 3-3V6h-2z"></path>
        </svg>
    )

    const SendIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-4">
            <path d="M14 2L0 6.67l5 2.64 5.67-3.98L6.7 11l2.63 5L14 2z"></path>
        </svg>
    )

    const GlobeIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" focusable="false" className="size-3">
            <path d="M8 1a7 7 0 107 7 7 7 0 00-7-7zM3 8a5 5 0 011-3l.55.55A1.5 1.5 0 015 6.62v1.07a.75.75 0 00.22.53l.56.56a.75.75 0 00.53.22H7v.69a.75.75 0 00.22.53l.56.56a.75.75 0 01.22.53V13a5 5 0 01-5-5zm6.24 4.83l2-2.46a.75.75 0 00.09-.8l-.58-1.16A.76.76 0 0010 8H7v-.19a.51.51 0 01.28-.45l.38-.19a.74.74 0 01.68 0L9 7.5l.38-.7a1 1 0 00.12-.48v-.85a.78.78 0 01.21-.53l1.07-1.09a5 5 0 01-1.54 9z"></path>
        </svg>
    )

    return (
        <div className="bg-white shadow-md rounded-lg p-4 mb-4 w-full max-w-md">
            <div className="relative">
                <div className="flex items-center mb-2">
                    <img
                        src="https://static.licdn.com/aero-v1/sc/h/aajlclc14rr2scznz5qm2rj9u"
                        alt="User Avatar"
                        className="w-12 h-12 mr-3"
                    />
                    <div className="flex flex-col gap-0">
                        <h2 className="font-bold">{post.oauthProvider && post.oauthProvider.pageName ? post.oauthProvider.pageName : 'Your Name'}</h2>
                        <p className="text-muted-foreground text-sm">Your linkedin profile title</p>
                        <div className="flex items-center">
                            <span className="text-muted-foreground text-xs">1d</span>
                            <Dot className="stroke-muted-foreground size-4" />
                            <GlobeIcon />
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 flex gap-1 justify-center">
                    <Plus className="size-5 stroke-blue-600" />
                    <p className="font-medium text-blue-500">Follow</p>
                </div>
            </div>
            <div className="w-full" style={{ whiteSpace: "pre-wrap" }}>
                <EditableContent id={post.id} content={post.content} viewContentEdit={viewContentEdit} setViewContentEdit={setViewContentEdit} />
            </div>
            <div className="w-full mt-3 flex gap-1">
                <img src="/linkedin-reactions.png" className="w-10 h-auto" />
                <p className="text-sm text-muted-foreground">534</p>
            </div>
            <hr className="w-full my-3" />
            <div className="flex w-full justify-around">
                <div className="flex items-center justify-center gap-1">
                    <LikeIcon />
                    <p className="font-semibold text-gray-600 text-sm">Like</p>

                </div>
                <div className="flex items-center justify-center gap-1">
                    <CommentIcon />
                    <p className="font-semibold text-gray-600 text-sm">Comment</p>

                </div>
                <div className="flex items-center justify-center gap-1">
                    <RepostIcon />
                    <p className="font-semibold text-gray-600 text-sm">Repost</p>

                </div>
                <div className="flex items-center justify-center gap-1">
                    <SendIcon />
                    <p className="font-semibold text-gray-600 text-sm">Send</p>
                </div>
            </div>
        </div>
    )
}

export default LinkedinPostView;