import { prisma } from "@/lib/prisma";
import { EmailTemplate } from "@/components/email-templates";

interface LogEmailOptions {
  userId: string;
  email: string;
  template: EmailTemplate;
  subject: string;
  trigger: "auto" | "manual_backfill" | "test";
  meta?: Record<string, unknown>;
}

/**
 * Write a record to the email-logs collection.
 * Always call this after a successful mail.sendTemplate().
 * Never throws — failures are only logged to console.
 */
export async function logEmail(options: LogEmailOptions): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        userId: options.userId,
        email: options.email,
        template: options.template,
        subject: options.subject,
        trigger: options.trigger,
        meta: options.meta ?? {},
      },
    });
  } catch (err) {
    console.error("[logEmail] Failed to write email log:", err);
  }
}
