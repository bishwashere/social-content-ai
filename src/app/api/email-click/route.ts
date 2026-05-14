import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FALLBACK_URL =
  process.env.NEXT_PUBLIC_APP_PRODUCTION_URL ?? "https://nextpostai.com";

/**
 * GET /api/email-click?t=<template>&r=<destination>&u=<userId>
 *
 * Tracking redirect for email links.
 * - Increments the aggregate click counter for the given template (fire-and-forget).
 * - If u= is present, also upserts a per-user click record in EmailUserClick.
 * - Immediately redirects the user to the destination URL.
 *
 * Query params:
 *   t  — email template key (e.g. INACTIVE_PROJECTS)
 *   r  — the real destination URL to redirect to
 *   u  — (optional) userId of the recipient, for per-user attribution
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const template = searchParams.get("t");
  const redirect = searchParams.get("r");
  const userId = searchParams.get("u");

  const destination = redirect ?? FALLBACK_URL;

  if (template) {
    // Aggregate counter — always updated regardless of whether userId is known
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
        console.error("[email-click] Failed to record aggregate click:", err)
      );

    // Per-user counter — only when we know who clicked
    if (userId) {
      prisma.emailUserClick
        .upsert({
          where: { userId_template: { userId, template } },
          create: { userId, template, clickCount: 1, lastClickAt: new Date() },
          update: {
            clickCount: { increment: 1 },
            lastClickAt: new Date(),
          },
        })
        .catch((err) =>
          console.error("[email-click] Failed to record per-user click:", err)
        );
    }
  }

  return NextResponse.redirect(destination, { status: 302 });
}
