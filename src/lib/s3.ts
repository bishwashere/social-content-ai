import {
  ListObjectsV2Command,
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
class S3 {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.CLOUDFLARE_R2_BUCKET!;
    this.s3 = new S3Client({
      region: "auto",
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
      },
    });
  }

  async listAllVideos(path: string) {
    const data = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: path,
      })
    );

    const videos = await Promise.all(
      (data.Contents || []).map(async (video) => {
        const url = await getSignedUrl(
          this.s3,
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: video.Key!,
          }),
          {
            expiresIn: 60 * 60, // 1 hour
          }
        );

        return {
          key: video.Key as string,
          name: video.Key?.replace(path, "") as string,
          url,
        };
      })
    );

    return videos;
  }

  async getPresignedUrlForVideoUpload(key: string) {
    const url = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: "video/mp4",
      }),
      {
        expiresIn: 60 * 60, // 1 hour
      }
    );

    return url;
  }

  async uploadTextAsFile(key: string, text: string) {
    const url = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: "text/plain",
      }),
      {
        expiresIn: 60 * 60,
      }
    );

    const res = await fetch(url, {
      method: "PUT",
      body: text,
      headers: {
        "Content-Type": "text/plain",
      },
    });

    return res.ok;
  }

  async getSignedUrlForVideoDownload(key: string) {
    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${key
          .split("/")
          .pop()}"`,
      }),
      {
        expiresIn: 60 * 60, // 1 hour
      }
    );

    return url;
  }

  async readDir(key: string) {
    const data = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: key,
      })
    );

    return data.Contents || [];
  }

  async copyVideo(from: string, to: string) {
    await this.s3.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: to,
        CopySource: `/${this.bucket}/${from}`,
      })
    );
  }

  async listAllViralMusics() {
    const data = await this.s3.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: "viral-music/",
      })
    );

    const withSignedUrl = await Promise.all(
      (data.Contents || []).map(async (music) => {
        const url = await getSignedUrl(
          this.s3,
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: music.Key!,
          }),
          {
            expiresIn: 60 * 60, // 1 hour
          }
        );

        return {
          key: music.Key as string,
          name: music.Key?.replace("viral-music/", "") as string,
          url,
        };
      })
    );

    return withSignedUrl || [];
  }
}

export const s3 = new S3();
