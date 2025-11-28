'use server';

import { TikTok, VideoUploadOptions } from "@/lib/3rd-providers/tiktok";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const uploadToTiktok = async (id: string, providerId: string) => {
    const video = await prisma.uploadedVideo.findUnique({
        where: {
            id: id
        }
    });
    const tiktok = await prisma.oauthProvider.findFirst({
        where: {
            id: providerId,
            platform: "tiktok"
        }
    });
    if (!video || !tiktok) {
        return { success: false, message: "Couldnot find video or account" };
    }

    const t = new TikTok({
        accessToken: tiktok.accessToken,
        refreshToken: tiktok.refreshToken!,
        expiresAt: tiktok.expiresAt!,
    });

    const options: VideoUploadOptions = {
        title: video.text,
        //TODO: remove below line after getting production api of tiktok
        privacy_level: "SELF_ONLY"
    };
    const videoUrl = `https://uploads.nextpostai.com/rendering/${video.folderId}/output.mp4`;
    const res = await t.postVideoFromUrl(videoUrl, options);

    if (res && res.publish_id) {
        await prisma.uploadedVideo.update({
            where: { id: video.id },
            data: { isPublised: true }
        });
        revalidatePath("/project/my-videos");
        return { success: true, message: "Video Posted in Tiktok" };
    }
    else {
        return { success: false, message: "Error while posting video to tiktok." };
    }

}