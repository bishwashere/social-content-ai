"use client";

import { Projects as Project } from "@prisma/client";
import { ContentGenerator } from "../../_components/content-generator";

type QuickGenerateProps = {
  project: Project;
};
export default function QuickGenerate({ project }: QuickGenerateProps) {

  if (project)
    return (
      <>
        <ContentGenerator project={project} />
      </>
    );
}
