import axios, { AxiosError, AxiosInstance } from "axios";
import fs from "fs";
import { prisma } from "../prisma";
import { decryptToken, encryptToken } from "@/backend-apis/encryption";

/**
 * Response from TikTok token refresh
 */
type TikTokTokenRefreshResponse = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
    open_id: string;
    scope: string;
    token_type: string;
};

/**
 * TikTok User Info
 */
type TikTokUser = {
    open_id: string;
    union_id: string;
    avatar_url: string;
    display_name?: string;
    username?: string;
    follower_count?: number;
    following_count?: number;
    likes_count?: number;
    video_count?: number;
};

/**
 * TikTok Video Info
 */
type TikTokVideo = {
    id: string;
    title?: string;
    create_time?: number;
    cover_image_url?: string;
    share_url?: string;
    video_description?: string;
    duration?: number;
    height?: number;
    width?: number;
    embed_html?: string;
    embed_link?: string;
    like_count?: number;
    comment_count?: number;
    share_count?: number;
    view_count?: number;
};

/**
 * Video Upload Options
 */
type VideoUploadOptions = {
    title: string;
    privacy_level?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
    disable_duet?: boolean;
    disable_comment?: boolean;
    disable_stitch?: boolean;
    video_cover_timestamp_ms?: number;
    brand_content_toggle?: boolean;
    brand_organic_toggle?: boolean;
};

/**
 * Video Upload Response
 */
type VideoUploadResponse = {
    publish_id: string;
    upload_url?: string;
};

/**
 * Post Status Response
 */
type PostStatusResponse = {
    status:
    | "PROCESSING_UPLOAD"
    | "PROCESSING_DOWNLOAD"
    | "SEND_TO_USER_INBOX"
    | "PUBLISH_COMPLETE"
    | "FAILED";
    fail_reason?: string;
    publicly_available_post_id?: string[];
    uploaded_bytes?: number;
};

/**
 * User Statistics
 */
type UserStatistics = {
    follower_count: number;
    following_count: number;
    likes_count: number;
    video_count: number;
};

class TikTok {
    private _accessToken: string;
    private _encryptedAccessToken: string;
    private _client: AxiosInstance;
    private _expiresAt: number;
    private _refreshToken: string;
    private _clientKey = process.env.TIKTOK_CLIENT_ID;
    private _clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    constructor(args: {
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
    }) {
        this._accessToken = decryptToken(args.accessToken);
        this._refreshToken = decryptToken(args.refreshToken);
        this._encryptedAccessToken = args.accessToken;
        this._expiresAt = args.expiresAt;

        this._client = axios.create({
            baseURL: "https://open.tiktokapis.com",
        });
    }

    private async _ensureAccessTokenValid(): Promise<void> {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (this._expiresAt - now < fiveMinutes) {
            await this._refreshAccessToken();
        }
    }

    private async _refreshAccessToken(): Promise<void> {
        try {
            console.log("📤 Sending refresh token request to TikTok API");

            const res = await axios.post(
                "https://open.tiktokapis.com/v2/oauth/token/",
                new URLSearchParams({
                    client_key: this._clientKey!,
                    client_secret: this._clientSecret!,
                    grant_type: "refresh_token",
                    refresh_token: this._refreshToken,
                }).toString(),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Cache-Control": "no-cache",
                    },
                }
            );

            const data: TikTokTokenRefreshResponse = res.data;
            this._expiresAt = Date.now() + data.expires_in * 1000;
            await prisma.oauthProvider.updateMany({
                where: {
                    accessToken: this._encryptedAccessToken
                },
                data: {
                    accessToken: encryptToken(data.access_token),
                    refreshToken: encryptToken(data.refresh_token)
                }
            })
            this._accessToken = data.access_token;
            this._refreshToken = data.refresh_token;
        } catch (error) {
            console.error("Failed to refresh access token:", error);
            throw error;
        }
    }

    /**
     * Get current user's profile information
     */
    async getUserInfo(fields?: string[]): Promise<TikTokUser | null> {
        try {
            await this._ensureAccessTokenValid();

            const defaultFields = [
                "open_id",
                "union_id",
                "avatar_url",
                "display_name",
                "follower_count",
                "following_count",
                "likes_count",
                "video_count",
            ];

            const queryFields = fields || defaultFields;

            const res = await this._client.get(
                `/v2/user/info/?fields=${queryFields.join(",")}`,
                {
                    headers: {
                        Authorization: `Bearer ${this._accessToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            return res.data.data.user;
        } catch (error) {
            console.error("Failed to get user info:", error);
            return null;
        }
    }


    /**
     * Get list of user's videos
     */
    async getVideoList(params?: {
        max_count?: number;
        cursor?: number;
        fields?: string[];
    }): Promise<{
        videos: TikTokVideo[];
        cursor: number;
        has_more: boolean;
    } | null> {
        try {
            await this._ensureAccessTokenValid();

            const defaultFields = [
                "id",
                "title",
                "create_time",
                "cover_image_url",
                "share_url",
                "video_description",
                "duration",
                "height",
                "width",
                "like_count",
                "comment_count",
                "share_count",
                "view_count",
            ];

            const fields = params?.fields || defaultFields;

            const res = await this._client.post(
                `/v2/video/list/?fields=${fields.join(",")}`,
                {
                    max_count: params?.max_count || 20,
                    cursor: params?.cursor || 0,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this._accessToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            return {
                videos: res.data.data.videos,
                cursor: res.data.data.cursor,
                has_more: res.data.data.has_more,
            };
        } catch (error) {
            console.error("Failed to get video list:", error);
            return null;
        }
    }

    /**
     * Get specific videos by their IDs
     */
    async getVideosByIds(
        videoIds: string[],
        fields?: string[]
    ): Promise<TikTokVideo[] | null> {
        try {
            await this._ensureAccessTokenValid();

            const defaultFields = [
                "id",
                "title",
                "create_time",
                "cover_image_url",
                "video_description",
                "duration",
                "like_count",
                "comment_count",
                "share_count",
                "view_count",
            ];

            const queryFields = fields || defaultFields;

            const res = await this._client.post(
                `/v2/video/query/?fields=${queryFields.join(",")}`,
                {
                    filters: {
                        video_ids: videoIds.slice(0, 20), // Max 20 videos per request
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this._accessToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            return res.data.data.videos;
        } catch (error) {
            console.error("Failed to get videos by IDs:", error);
            return null;
        }
    }

    /**
     * Initialize video upload and get upload URL
     * Use this for direct posting to TikTok
     */
    async initializeVideoUpload(
        options: VideoUploadOptions,
        source: "FILE_UPLOAD" | "PULL_FROM_URL",
        sourceInfo:
            | {
                video_size: number;
                chunk_size: number;
                total_chunk_count: number;
            }
            | { video_url: string }
    ): Promise<VideoUploadResponse | null> {
        try {
            await this._ensureAccessTokenValid();

            const payload: any = {
                post_info: {
                    title: options.title,
                    privacy_level: options.privacy_level || "PUBLIC_TO_EVERYONE",
                    disable_duet: options.disable_duet || false,
                    disable_comment: options.disable_comment || false,
                    disable_stitch: options.disable_stitch || false,
                    video_cover_timestamp_ms: options.video_cover_timestamp_ms || 1000,
                },
                source_info: {
                    source,
                    ...sourceInfo,
                },
            };

            const res = await this._client.post(
                "/v2/post/publish/video/init/",
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${this._accessToken}`,
                        "Content-Type": "application/json; charset=UTF-8",
                    },
                }
            );

            return {
                publish_id: res.data.data.publish_id,
                upload_url: res.data.data.upload_url,
            };
        } catch (error) {
            const err = error as AxiosError;
            console.error("Failed to initialize video upload:", err?.response?.data);
            return null;
        }
    }

    /**
     * Upload video file to TikTok
     * Call this after initializeVideoUpload with FILE_UPLOAD source
     */
    async uploadVideoFile(
        uploadUrl: string,
        videoPath: string
    ): Promise<boolean> {
        try {
            const videoBuffer = fs.readFileSync(videoPath);
            const videoSize = videoBuffer.length;

            await axios.put(uploadUrl, videoBuffer, {
                headers: {
                    "Content-Type": "video/mp4",
                    "Content-Length": videoSize.toString(),
                    "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
                },
            });

            return true;
        } catch (error) {
            console.error("Failed to upload video file:", error);
            return false;
        }
    }

    /**
     * Post video to TikTok from local file
     */
    async postVideoFromFile(
        videoPath: string,
        options: VideoUploadOptions
    ): Promise<{ publish_id: string } | null> {
        try {
            const stats = fs.statSync(videoPath);
            const videoSize = stats.size;
            const chunkSize = Math.min(videoSize, 10 * 1024 * 1024); // 10MB chunks
            const totalChunks = Math.ceil(videoSize / chunkSize);

            // Step 1: Initialize upload
            const initResult = await this.initializeVideoUpload(
                options,
                "FILE_UPLOAD",
                {
                    video_size: videoSize,
                    chunk_size: chunkSize,
                    total_chunk_count: totalChunks,
                }
            );

            if (!initResult || !initResult.upload_url) {
                console.error("Failed to initialize video upload");
                return null;
            }

            // Step 2: Upload video file
            const uploadSuccess = await this.uploadVideoFile(
                initResult.upload_url,
                videoPath
            );

            if (!uploadSuccess) {
                console.error("Failed to upload video file");
                return null;
            }

            return { publish_id: initResult.publish_id };
        } catch (error) {
            console.error("Failed to post video from file:", error);
            return null;
        }
    }

    /**
     * Post video to TikTok from URL
     */
    async postVideoFromUrl(
        videoUrl: string,
        options: VideoUploadOptions
    ): Promise<{ publish_id: string } | null> {
        try {
            const initResult = await this.initializeVideoUpload(
                options,
                "PULL_FROM_URL",
                {
                    video_url: videoUrl,
                }
            );

            if (!initResult) {
                console.error("Failed to initialize video upload from URL");
                return null;
            }

            return { publish_id: initResult.publish_id };
        } catch (error) {
            const err = error as AxiosError;
            console.error("Failed to post video from URL:", err?.response?.data);
            return null;
        }
    }

    /**
     * Check the status of a video post
     */
    async getPostStatus(publishId: string): Promise<PostStatusResponse | null> {
        try {
            await this._ensureAccessTokenValid();

            const res = await this._client.post(
                "/v2/post/publish/status/fetch/",
                {
                    publish_id: publishId,
                },
                {
                    headers: {
                        Authorization: `Bearer ${this._accessToken}`,
                        "Content-Type": "application/json; charset=UTF-8",
                    },
                }
            );

            return res.data.data;
        } catch (error) {
            console.error("Failed to get post status:", error);
            return null;
        }
    }

    /**
     * Get creator information (useful before posting)
     */
    async getCreatorInfo(): Promise<any | null> {
        try {
            await this._ensureAccessTokenValid();

            const res = await this._client.post(
                "/v2/post/publish/creator_info/query/",
                {},
                {
                    headers: {
                        Authorization: `Bearer ${this._accessToken}`,
                        "Content-Type": "application/json; charset=UTF-8",
                    },
                }
            );

            return res.data.data;
        } catch (error) {
            console.error("Failed to get creator info:", error);
            return null;
        }
    }
}

export { TikTok };
export type {
    TikTokUser,
    TikTokVideo,
    VideoUploadOptions,
    VideoUploadResponse,
    PostStatusResponse,
    UserStatistics,
};