# Email Click Tracking

Template-level click tracking for all outbound links embedded in email templates. No user-level data is stored — every counter is aggregate per template.

---

## How it works

```
User clicks link in email
        │
        ▼
GET /api/email-click?t=<template>&r=<destination>
        │
        ├─► Upsert EmailLinkClick { template } → clickCount += 1   (fire-and-forget)
        │
        └─► 302 redirect → original destination
```

1. When an email is prepared for sending, every clickable URL (buttons, fallback text links) is wrapped by `buildTrackedUrl()` from `src/lib/email-tracking.ts`.
2. The wrapped URL is a redirect through `/api/email-click`.
3. The route increments `EmailLinkClick.clickCount` for that template and immediately redirects — the user experiences no perceptible delay.
4. Failures in the DB write are swallowed and logged; the redirect always happens.

---

## Files

| File | Role |
|---|---|
| `src/lib/email-tracking.ts` | `buildTrackedUrl(destination, template)` helper |
| `src/app/api/email-click/route.ts` | Tracking redirect endpoint |
| `prisma/schema.prisma` → `EmailLinkClick` | MongoDB collection, one doc per template |

---

## Database model

```prisma
model EmailLinkClick {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  template    String   @unique       // e.g. "INACTIVE_PROJECTS"
  clickCount  Int      @default(0)
  lastClickAt DateTime @default(now())

  @@map("email-link-clicks")
}
```

---

## Adding tracking to a new email send site

Import `buildTrackedUrl` and wrap any destination URL before passing it to `mail.sendTemplate()`:

```ts
import { buildTrackedUrl } from "@/lib/email-tracking";

const trackedUrl = buildTrackedUrl(rawUrl, "WELCOME_ON_LOGIN");

await mail.sendTemplate("WELCOME_ON_LOGIN", { ..., activationLink: trackedUrl }, { ... });
```

---

## Currently tracked templates

| Template | Tracked prop |
|---|---|
| `INACTIVE_PROJECTS` | `dashboardUrl` |
| `FIRST_PROJECT_CREATED` | `projectUrl` |

Templates that are not yet actively sent (`WELCOME_ON_LOGIN`, `SIGNUP_NO_PROJECT`, `MILESTONE_REACHED`) should have their URL props wrapped with `buildTrackedUrl` once they are wired up to a send site.

---

## Querying click stats

Direct MongoDB / Prisma query:

```ts
const stats = await prisma.emailLinkClick.findMany({
  orderBy: { clickCount: "desc" },
});
```

Or via the Prisma Studio (`npx prisma studio`) → `email-link-clicks` collection.
