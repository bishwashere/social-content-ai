import { FirstViewTooltip } from "@generated/prisma";

export type TooltipKeysType = keyof Pick<
  FirstViewTooltip,
  "addProject" | "contentPlanner" | "quickGenerate"
>;

export type FirstViewTooltipType = Pick<FirstViewTooltip, TooltipKeysType>;
