# Unexpected Issues

## Resolved Issues

All previously listed issues have been resolved:
- TypeScript errors fixed
- React/JSX errors fixed
- ESLint warnings addressed (remaining warnings are non-blocking)

## Recent Fixes

1. `src/lib/3rd-providers/fb.ts` - Fixed `'shares is not defined'` error by initializing and fetching shares separately
2. `src/app/(pages)/project/analytics/_components/tabs/view-analytics.tsx` - Fixed chart not displaying posts by implementing dynamic Y-axis domain calculation
3. Removed unused error variables in catch blocks to fix ESLint warnings
4. `src/app/(landing)/page.tsx` - Removed unused catch variable `e`
5. `src/app/(pages)/project/[id]/_components/campaign-loading-card.tsx` - Removed unused `Card` import
6. `src/app/(pages)/project/[id]/_components/project-analytics.tsx` - Removed unused `Clock` import and `error` variable
7. `src/app/(pages)/project/[id]/_components/campaing-planner.tsx` - Removed unused imports: `PencilLine`, `RefreshCcw`, `Save`, `LoadingCard`, `Popover`, `PopoverContent`, `PopoverTrigger`. Replaced `<img>` with Next.js `<Image>` component
8. `src/app/(pages)/project/[id]/_components/scheduled-posts.tsx` - Replaced `<img>` with Next.js `<Image>` component and added proper alt text
9. Fixed React unescaped entities errors by escaping apostrophes in "Why it's safe" text across multiple components:
   - `src/app/(pages)/project/_components/get-started-guide.tsx`
   - `src/app/(pages)/project/settings/_components/oauth-providers-list.tsx`
   - `src/components/common/connect-accounts-button.tsx`

## Recent Fixes (Ideas Admin Feature)

10. `src/app/(pages)/ideas/admin/page.tsx` - Fixed empty catch block by adding error parameter and console.error logging
11. `src/app/(pages)/ideas/admin/new/page.tsx` - Fixed empty catch block by adding error parameter and console.error logging
12. `src/app/(pages)/ideas/admin/[id]/edit/page.tsx` - Fixed empty catch block by adding error parameter and console.error logging
13. `src/app/(pages)/ideas/admin/page.tsx` - Fixed React unescaped entities by escaping quotes in delete dialog message using `&quot;`
14. `src/app/(pages)/ideas/admin/page.tsx` - Removed unused `useRouter` import
15. `src/app/(pages)/ideas/admin/new/page.tsx` - Removed unused `data` parameter in mutation callback
16. `src/app/api/ideas/[id]/route.ts` - Fixed TypeScript type errors with Next.js 14 route params by using `params as { id: string }` instead of `{ params: { id: string } }`
17. `src/app/api/ideas/route.ts` - Fixed TypeScript middleware return type by checking `req.parsed` directly instead of middleware result

## Build Status

✅ Build compiles successfully with no errors
⚠️ Remaining warnings are non-blocking (mostly unused variables and React Hook dependencies)

