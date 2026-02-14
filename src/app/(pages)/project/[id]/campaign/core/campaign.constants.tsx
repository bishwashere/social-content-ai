"use client";

import Image from "next/image";
import { Projects } from "@prisma/client";
import {
  PLATFORM_IDS,
  PLATFORM_ICONS,
  PLATFORM_LABELS,
} from "@/constants/platforms";

export const PLATFORMS = [
  { key: PLATFORM_IDS.X, label: PLATFORM_LABELS[PLATFORM_IDS.X], icon: <Image src={PLATFORM_ICONS[PLATFORM_IDS.X]} width={16} height={16} alt="X" className="dark:brightness-0 dark:invert" /> },
  { key: PLATFORM_IDS.FACEBOOK, label: PLATFORM_LABELS[PLATFORM_IDS.FACEBOOK], icon: <Image src={PLATFORM_ICONS[PLATFORM_IDS.FACEBOOK]} width={16} height={16} alt="Facebook" className="dark:brightness-0 dark:invert" /> },
  { key: PLATFORM_IDS.LINKEDIN, label: PLATFORM_LABELS[PLATFORM_IDS.LINKEDIN], icon: <Image src={PLATFORM_ICONS[PLATFORM_IDS.LINKEDIN]} width={16} height={16} alt="LinkedIn" className="dark:brightness-0 dark:invert" /> },
  { key: PLATFORM_IDS.INSTAGRAM, label: PLATFORM_LABELS[PLATFORM_IDS.INSTAGRAM], icon: <Image src={PLATFORM_ICONS[PLATFORM_IDS.INSTAGRAM]} width={16} height={16} alt="Instagram" className="dark:brightness-0 dark:invert" /> },
  { key: PLATFORM_IDS.THREADS, label: PLATFORM_LABELS[PLATFORM_IDS.THREADS], icon: <Image src={PLATFORM_ICONS[PLATFORM_IDS.THREADS]} width={16} height={16} alt="Threads" className="dark:brightness-0 dark:invert" /> },
  { key: PLATFORM_IDS.REDDIT, label: PLATFORM_LABELS[PLATFORM_IDS.REDDIT], icon: <Image src={PLATFORM_ICONS[PLATFORM_IDS.REDDIT]} width={16} height={16} alt="Reddit" className="dark:brightness-0 dark:invert" /> },
  { key: PLATFORM_IDS.TIKTOK, label: PLATFORM_LABELS[PLATFORM_IDS.TIKTOK], icon: <Image src={PLATFORM_ICONS[PLATFORM_IDS.TIKTOK]} width={16} height={16} alt="TikTok" className="dark:brightness-0 dark:invert" /> }
];

// Use centralized PLATFORM_ICONS from constants
export const ICONS = PLATFORM_ICONS;

export const getPrompt = (str: string) => `
Description: ${str}
`;

export const BLOG_NEWS_ANGLES = [
  "Economic Reality Angle",
  "Market Dynamics Angle",
  "Innovation Constraint Angle",
  "Risk & Bubble Angle",
  "Enterprise Productivity Angle",
  "Builder/Creator Angle",
  "Startup Opportunity Angle",
  "Sustainability Angle",
  "Regulatory Angle",
  "Human Impact Angle",
  "Future Forecast Angle",
  "Tech Infrastructure Angle",
  "Adoption Reality Angle",
  "Strategic Pivot Angle",
  "Operational Efficiency Angle",
  "Narrative Shift Angle",
  "Contrarian Angle",
  "Psychology of Hype Angle",
  "System-Level Angle",
  "User-Centric Angle"
];

export const ANGLE_DESCRIPTIONS: Record<string, string> = {
  "Economic Reality Angle": "Explore whether the financial assumptions behind this trend actually hold up.",
  "Market Dynamics Angle": "Examine how this news shifts competitive power across the industry.",
  "Innovation Constraint Angle": "Analyze whether costs, regulations, or resources slow down progress.",
  "Risk & Bubble Angle": "Look at the possibility of market overinvestment or corrections.",
  "Enterprise Productivity Angle": "Focus on how businesses can use this technology for real ROI.",
  "Builder/Creator Angle": "Interpret what this means for small teams and indie product builders.",
  "Startup Opportunity Angle": "Identify gaps, openings, or underserved problems this news exposes.",
  "Sustainability Angle": "Discuss long-term feasibility in terms of cost, energy, and maintenance.",
  "Regulatory Angle": "Look at how governments, laws, or policy shifts may affect outcomes.",
  "Human Impact Angle": "Explore how this trend affects workers, consumers, and everyday people.",
  "Future Forecast Angle": "Project how this situation may evolve over the next 3–5 years.",
  "Tech Infrastructure Angle": "Break down the hardware, scale, and infrastructure implications.",
  "Adoption Reality Angle": "Evaluate what adoption looks like outside of hype cycles.",
  "Strategic Pivot Angle": "Explain how companies should rethink their long-term strategy.",
  "Operational Efficiency Angle": "Show how systems, pipelines, or workflows may improve.",
  "Narrative Shift Angle": "Reframe the story around a deeper message or misunderstood truth.",
  "Contrarian Angle": "Explore the viewpoint that challenges the mainstream interpretation.",
  "Psychology of Hype Angle": "Analyze how hype cycles distort decisions and expectations.",
  "System-Level Angle": "Connect this news to broader forces like geopolitics or global markets.",
  "User-Centric Angle": "Reinterpret the news through the lens of the end user or customer."
};

export type Props = {
  project: Projects;
  /** When false, campaign analytics block is hidden (same gate as project analytics: need 1+ scheduled or 3+ successful posts). */
  analyticsEligible?: boolean;
};
