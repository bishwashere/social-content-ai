import { ScheduledPost } from "@prisma/client";
import { MoreHorizontal } from "lucide-react";
import EditableContent from "./editable-content";
import { ViewMedia } from "./view-media";

type Props = {
    post: ScheduledPost;
    viewContentEdit: string[];
    setViewContentEdit: React.Dispatch<React.SetStateAction<string[]>>;
};

const InstagramPostView = ({
    post,
    viewContentEdit,
    setViewContentEdit,
}: Props) => {
    const HeartIcon = () => (
        <svg
            viewBox="0 0 24 24"
            className="size-6 fill-none stroke-current"
            strokeWidth="2"
        >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
    );

    const CommentIcon = () => (
        <svg
            viewBox="0 0 24 24"
            className="size-6 fill-none stroke-current"
            strokeWidth="2"
        >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
    );

    const ShareIcon = () => (
        <svg
            viewBox="0 0 24 24"
            className="size-6 fill-none stroke-current"
            strokeWidth="2"
        >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </svg>
    );

    const BookmarkIcon = () => (
        <svg
            viewBox="0 0 24 24"
            className="size-6 fill-none stroke-current"
            strokeWidth="2"
        >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
    );

    return (
        <div className="bg-white dark:bg-muted shadow-md rounded-lg overflow-hidden mb-4 max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <img
                        src="https://randomuser.me/api/portraits/women/60.jpg"
                        alt="User Avatar"
                        className="w-8 h-8 rounded-full ring-2 ring-gray-100 dark:ring-gray-700"
                    />
                    <div className="flex items-center gap-1">
                        <p className="text-sm font-semibold dark:text-foreground">
                            username
                        </p>
                        <span className="text-gray-400 dark:text-gray-500 text-sm">
                            • 1h
                        </span>
                    </div>
                </div>
                <button className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    <MoreHorizontal className="size-6" />
                </button>
            </div>

            {/* Image/Media Section */}
            <div className="relative bg-black aspect-square">
                {viewContentEdit.includes(post.id) ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <p className="text-gray-400 text-sm">Media Preview</p>
                    </div>
                ) : (
                    <ViewMedia post={post} showMedia={true} />
                )}
            </div>

            {/* Action Buttons */}
            <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <button className="text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                            <HeartIcon />
                        </button>
                        <button className="text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                            <CommentIcon />
                        </button>
                        <button className="text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                            <ShareIcon />
                        </button>
                    </div>
                    <button className="text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
                        <BookmarkIcon />
                    </button>
                </div>

                {/* Likes Count */}
                <div className="mb-2">
                    <p className="text-sm font-semibold dark:text-foreground">
                        24,583 likes
                    </p>
                </div>

                {/* Caption */}
                <div className="mb-2">
                    <EditableContent
                        id={post.id}
                        media={post.media}
                        content={post.content}
                        viewContentEdit={viewContentEdit}
                        setViewContentEdit={setViewContentEdit}
                        showMedia={false}
                    />
                </div>

                {/* View Comments */}
                <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-1">
                    View all 432 comments
                </button>

                {/* Add Comment */}
                <div className="flex items-center gap-2 pt-2 border-t dark:border-gray-700">
                    <img
                        src="https://randomuser.me/api/portraits/women/60.jpg"
                        alt="Your Avatar"
                        className="w-6 h-6 rounded-full"
                    />
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-1 text-sm bg-transparent outline-none dark:text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        disabled
                    />
                    <button className="text-sm font-semibold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 opacity-50">
                        Post
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstagramPostView;