export type GenerateVideoProps = {
  name: string;
  viralVideoId: string;
  video: File | string; // File for direct upload, string for media-uploads key
  text: string;
  musicId: string | null | undefined;
  projectId?: string;
  campaignPlannerId?: string;
  day?: number;
};
