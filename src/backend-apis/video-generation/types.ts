export type GenerateVideoProps = {
  name: string;
  viralVideoId: string;
  video: File | string;
  text: string;
  musicId: string | null | undefined;
  projectId?: string;
  campaignPlannerId?: string;
  day?: number;
};
