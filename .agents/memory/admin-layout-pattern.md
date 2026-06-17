---
name: Admin layout pattern
description: All admin pages use AdminLayout component at client/src/components/layout/admin-layout.tsx instead of repeating the flex wrapper + Sidebar boilerplate.
---

All admin pages (employees, audit, adjustments, absenteismo, holidays, settings, reports, import, timesheet) use `<AdminLayout>` from `@/components/layout/admin-layout`.

**Why:** The old pattern `<div className="flex min-h-screen bg-background/50"><Sidebar /><main className="flex-1 lg:ml-64 ...">` caused mobile layout issues: content appeared narrow due to `bg-background/50` opacity and the flex container not being `w-full`. AdminLayout fixes this with `min-h-screen bg-background w-full` and proper mobile padding (`px-4 pt-16 pb-8` on mobile, `lg:px-8 lg:pt-8` on desktop). The `pt-16` on mobile accounts for the fixed hamburger button at `top-4 left-4`.

**How to apply:** When adding a new admin page, import `AdminLayout` from `@/components/layout/admin-layout` and wrap the return with `<AdminLayout>`. Each page still provides its own `<div className="max-w-* mx-auto space-y-*">` inner container. Dashboard is the exception — it has its own sticky top bar and uses the shell directly without AdminLayout.
