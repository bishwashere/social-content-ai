# Email Click Tracking

Template-level and per-user click tracking for all outbound links embedded in email templates.

---

## How it works

```
User clicks link in email
        │
        ▼
GET /api/email-click?t=<template>&r=<destination>&u=<userId>
        │
        ├─► Upsert EmailLinkClick { template } → clickCount += 1   (aggregate, fire-and-forget)
        │
        ├─► Upsert EmailUserClick { userId, template } → clickCount += 1   (per-user, fire-and-forget, only when u= present)
        │
        └─► 302 redirect → original destination (always happens, even if DB writes fail)
```

1. When an email is prepared for sending, every clickable URL (buttons, fallback text links) is wrapped by `buildTrackedUrl()` from `src/lib/email-tracking.ts`.
2. Pass the recipient's `userId` as the third argument so per-user attribution is recorded.
3. The wrapped URL routes through `/api/email-click`.
4. The route increments both the aggregate counter and the per-user counter, then immediately redirects — the user experiences no perceptible delay.
5. Failures in the DB writes are swallowed and logged; the redirect always happens.

---

## Smart destination URLs

Email buttons should always land the user in the most useful place:

| Email | Redirect destination |
|-------|---------------------|
| `FIRST_PROJECT_CREATED` | `/project/{projectId}` — the specific project just created |
| `INACTIVE_PROJECTS` | `/project/{firstInactiveProjectId}` — first inactive project, or `/project` if none identifiable |

The `r=` param in the tracked URL carries the fully resolved destination, so the endpoint just redirects without needing to know about project IDs.

---

## Files

| File | Role |
|---|---|
| `src/lib/email-tracking.ts` | `buildTrackedUrl(destination, template, userId?)` helper |
| `src/app/api/email-click/route.ts` | Tracking redirect endpoint |
| `prisma/schema.prisma` → `EmailLinkClick` | MongoDB collection, one doc per template (aggregate) |
| `prisma/schema.prisma` → `EmailUserClick` | MongoDB collection, one doc per (userId × template) |

---

## Database models

```prisma
// Aggregate — one document per template
model EmailLinkClick {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  template    String   @unique
  clickCount  Int      @default(0)
  lastClickAt DateTime @default(now())

  @@map("email-link-clicks")
}

// Per-user — one document per (userId × template) pair
model EmailUserClick {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  userId      String   @db.ObjectId
  template    String
  clickCount  Int      @default(0)
  lastClickAt DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, template])
  @@map("email-user-clicks")
}
```

---

## Adding tracking to a new email send site

```ts
import { buildTrackedUrl } from "@/lib/email-tracking";

// Pass userId so per-user attribution is recorded
const trackedUrl = buildTrackedUrl(rawUrl, "WELCOME_ON_LOGIN", user.id);

await mail.sendTemplate("WELCOME_ON_LOGIN", { ..., activationLink: trackedUrl }, { ... });
```

---

## Currently tracked templates

| Template | Tracked prop | Destination |
|---|---|---|
| `INACTIVE_PROJECTS` | `dashboardUrl` | First inactive project, or `/project` |
| `FIRST_PROJECT_CREATED` | `projectUrl` | `/project/{projectId}` |

Templates not yet actively sent (`WELCOME_ON_LOGIN`, `SIGNUP_NO_PROJECT`, `MILESTONE_REACHED`) should have their URL props wrapped with `buildTrackedUrl(url, template, user.id)` once wired up.

---

## Using per-user click data for suppression

Check `EmailUserClick` before deciding to re-send:

```ts
const alreadyClicked = await prisma.emailUserClick.findFirst({
  where: { userId, template: "INACTIVE_PROJECTS" },
});

if (!alreadyClicked) {
  // user received the email but never engaged — safe to send a follow-up
}
```

---

## Querying click stats

**Aggregate (per template):**
```ts
const stats = await prisma.emailLinkClick.findMany({
  orderBy: { clickCount: "desc" },
});
```

**Per-user (who clicked which template):**
```ts
const userClicks = await prisma.emailUserClick.findMany({
  where: { template: "INACTIVE_PROJECTS" },
  orderBy: { lastClickAt: "desc" },
  include: { user: { select: { email: true, name: true } } },
});
```

Or browse via Prisma Studio (`npx prisma studio`) → `email-link-clicks` / `email-user-clicks` collections.
