import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FALLBACK_URL =
  process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? "https://nextpostai.com";

/**
 * GET /api/email-click?t=<template>&r=<destination>
 *
 * Tracking redirect for email links.
 * - Increments the aggregate click counter for the given template (fire-and-forget).
 * - Immediately redirects the user to the destination URL.
 *
 * Query params:
 *   t  — email template key (e.g. INACTIVE_PROJECTS)
 *   r  — the real destination URL to redirect to
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const template = searchParams.get("t");
  const redirect = searchParams.get("r");

  const destination = redirect ?? FALLBACK_URL;

  if (template) {
    prisma.emailLinkClick
      .upsert({
        where: { template },
        create: { template, clickCount: 1, lastClickAt: new Date() },
        update: {
          clickCount: { increment: 1 },
          lastClickAt: new Date(),
        },
      })
      .catch((err) =>
        console.error("[email-click] Failed to record click:", err)
      );
  }

  return NextResponse.redirect(destination, { status: 302 });
}
